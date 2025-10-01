// pages/api/user/follow.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { rl } from "@/lib/rateLimiter";

const IS_DEV = process.env.NODE_ENV !== "production";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) return res.status(401).json({ error: "No autorizado" });

    // resolver currentUserId (session.user.id o buscar por email)
    let currentUserId: string | null = (session.user as any)?.id ?? null;
    if (!currentUserId && session.user?.email) {
      const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      currentUserId = me?.id ?? null;
    }
    if (!currentUserId) return res.status(401).json({ error: "No se pudo identificar al usuario" });

    // RATE LIMIT: consume 1 punto por usuario (fail-open si rl no disponible)
    try {
      if (rl && typeof rl.consume === "function") {
        await rl.consume(currentUserId);
      }
    } catch (rlErr: any) {
      // si es rechazo por límite -> devolver 429
      const isRateLimitReject =
        rlErr && (typeof rlErr === "object") && ("msBeforeNext" in rlErr || "remaining" in rlErr);
      console.warn("[follow] rateLimiter result:", rlErr?.message ?? rlErr);
      if (isRateLimitReject) {
        return res.status(429).json({ error: "Demasiadas solicitudes. Intenta en unos segundos." });
      }
      // infra error -> permitir (fail-open)
      console.warn("[follow] rateLimiter infra error -> allowing operation (fail-open).");
    }

    const { targetId } = req.body as { targetId?: string };
    if (!targetId || typeof targetId !== "string") return res.status(400).json({ error: "targetId requerido" });
    if (targetId === currentUserId) return res.status(400).json({ error: "No puedes seguirte a ti mismo" });

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) return res.status(404).json({ error: "Usuario objetivo no encontrado" });

    // transacción robusta: findFirst + create/deleteMany + FollowEvent (event no crítico)
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userLike.findFirst({
        where: { userId: targetId, likedById: currentUserId },
        select: { id: true },
      });

      if (existing) {
        await tx.userLike.deleteMany({ where: { userId: targetId, likedById: currentUserId } });
        try {
          await tx.followEvent.create({ data: { userId: targetId, actorId: currentUserId, type: "unfollow" } });
        } catch (e) {
          console.warn("[follow] followEvent.create(unfollow) failed:", e);
        }
        const followersCount = await tx.userLike.count({ where: { userId: targetId } });
        return { followed: false, followersCount, action: "unfollow" };
      } else {
        await tx.userLike.create({ data: { userId: targetId, likedById: currentUserId } });
        try {
          await tx.followEvent.create({ data: { userId: targetId, actorId: currentUserId, type: "follow" } });
        } catch (e) {
          console.warn("[follow] followEvent.create(follow) failed:", e);
        }
        const followersCount = await tx.userLike.count({ where: { userId: targetId } });
        return { followed: true, followersCount, action: "follow" };
      }
    });

    return res.status(200).json({ followed: result.followed, followersCount: result.followersCount });
  } catch (err: any) {
    console.error("/api/user/follow error:", { message: err?.message, code: err?.code, meta: err?.meta });
    // P2002 = unique violation -> considerarlo como ya seguido
    if (err?.code === "P2002") {
      try {
        const followersCount = await prisma.userLike.count({ where: { userId: (req.body || {}).targetId } });
        return res.status(200).json({ followed: true, followersCount });
      } catch (countErr) {
        console.error("follow fallback count error:", countErr);
      }
    }
    if (IS_DEV) {
      return res.status(500).json({ error: "Error interno (dev)", message: err?.message, code: err?.code });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
