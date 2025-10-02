// pages/api/user/isFollowing.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const targetId = String(req.query.targetId ?? "");
    if (!targetId) return res.status(400).json({ error: "targetId requerido" });

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      // si no hay sesión respondemos false (el frontend normalmente redirige a login antes)
      return res.status(200).json({ followed: false });
    }

    let currentUserId: string | null = (session.user as any)?.id ?? null;
    if (!currentUserId && session.user.email) {
      const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      currentUserId = u?.id ?? null;
    }
    if (!currentUserId) return res.status(200).json({ followed: false });

    if (currentUserId === targetId) return res.status(200).json({ followed: false });

    const found = await prisma.userLike.findFirst({
      where: { userId: targetId, likedById: currentUserId },
      select: { id: true },
    });

    return res.status(200).json({ followed: Boolean(found) });
  } catch (_err) {
    console.error("API /api/user/isFollowing error:", _err);
    return res.status(500).json({ error: "Error interno" });
  }
}
