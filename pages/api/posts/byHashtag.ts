// pages/api/posts/byHashtag.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { checkRateLimitPreview } from "@/lib/rateLimit";

async function getPrisma() {
  try {
    const mod = await import("@/lib/prisma");
    return (mod as any).prisma ?? (mod as any).default ?? null;
  } catch (_) {
    try {
      const mod = await import("@/lib/prisma");
      return (mod as any).prisma ?? (mod as any).default ?? null;
    } catch (err) {
      throw new Error(
        "No se pudo importar prisma desde '@/lib/prisma' ni '../../lib/prisma'. Revisa lib/prisma.ts"
      );
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    // rate-limit (preview policy)
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anon";
    const rl = await checkRateLimitPreview(String(ip));
    if (!rl.success) {
      const now = Date.now();
      const retryAfterSec = rl.reset ? Math.max(1, Math.ceil((Number(rl.reset) - now) / 1000)) : 60;
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: "Too many requests" });
    }

    const prisma = await getPrisma();
    if (!prisma) throw new Error("Prisma no disponible");

    const rawTag = Array.isArray(req.query.tag) ? req.query.tag[0] : String(req.query.tag ?? "");
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Math.max(1, Math.min(50, Number(limitParam ?? 1))); // por defecto 1, cap 50

    if (!rawTag) {
      return res.status(400).json({ error: "Hashtag no proporcionado" });
    }

    const tag = rawTag.replace(/^#/, "").trim();
    if (!tag) return res.status(400).json({ error: "Hashtag inválido" });

    // Buscar por array hashtags (has) OR por contenido que contenga "#tag" (insensitive)
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { hashtags: { has: tag } },
          { content: { contains: `#${tag}`, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        content: true,
        image: true,
        createdAt: true,
        author: { select: { id: true, username: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Serializar fechas a ISO (seguro para el cliente)
    const safe = posts.map((p: any) => ({
      id: p.id,
      content: p.content,
      image: p.image ?? null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      author: p.author ?? null,
    }));

    return res.status(200).json(safe);
  } catch (error: any) {
    console.error("Error in /api/posts/byHashtag:", error);
    return res.status(500).json({ error: String(error?.message ?? "Error interno del servidor") });
  }
}
