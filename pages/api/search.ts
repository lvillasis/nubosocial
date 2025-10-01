// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { checkRateLimitSearch } from "@/lib/rateLimit";

async function getPrisma() {
  try {
    const mod = await import("@/lib/prisma");
    // support both named export and default export
    return (mod as any).prisma ?? (mod as any).default ?? null;
  } catch (_) {
    try {
      const mod = await import("../../lib/prisma");
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
    // rate-limit (search policy)
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anon";
    const rl = await checkRateLimitSearch(String(ip));
    if (!rl.success) {
      const now = Date.now();
      const retryAfterSec = rl.reset ? Math.max(1, Math.ceil((Number(rl.reset) - now) / 1000)) : 60;
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: "Too many requests" });
    }

    const prisma = await getPrisma();
    if (!prisma) throw new Error("Prisma no disponible");

    const qRaw = (req.query.q as string) || "";
    const q = qRaw.trim();
    if (!q) return res.status(200).json([]);

    const isHashtag = q.startsWith("#");
    const isMention = q.startsWith("@");
    const clean = isHashtag || isMention ? q.slice(1).trim() : q;
    const cleanLower = clean.toLowerCase();

    // Usuarios (defensivo)
    const users = await prisma.user.findMany({
      where: isMention
        ? { username: { startsWith: clean, mode: "insensitive" } }
        : {
            OR: [
              { username: { contains: clean, mode: "insensitive" } },
              { name: { contains: clean, mode: "insensitive" } },
              { bio: { contains: clean, mode: "insensitive" } },
            ],
          },
      take: 10,
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        bio: true,
        // cuenta segura si existe
        _count: { select: { profileLikes: true } },
      },
    });

    // Posts
    const posts = await prisma.post.findMany({
      where: isHashtag
        ? { hashtags: { has: cleanLower } }
        : {
            OR: [
              { content: { contains: q, mode: "insensitive" } },
              { hashtags: { has: q.toLowerCase() } },
            ],
          },
      include: {
        author: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    // Formateo defensivo para evitar null/undefined y convertir Dates a strings
    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image ?? null,
      bio: u.bio ?? null,
      followers: (u?._count?.profileLikes) ?? 0,
      type: "user",
    }));

    const formattedPosts = posts.map((p: any) => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      author: p.author
        ? {
            id: p.author.id,
            username: p.author.username,
            name: p.author.name,
            image: p.author.image ?? null,
          }
        : null,
      images: p.image ? [p.image] : [],
      type: "post",
    }));

    return res.status(200).json([...formattedUsers, ...formattedPosts]);
  } catch (err: any) {
    // Log completo en servidor para debugging (no mostrar stack completo al cliente)
    console.error("ERROR /api/search:", err);
    // Siempre devolver JSON (evita que Next dev devuelva HTML con stack)
    return res.status(500).json({ error: String(err?.message ?? "Error interno") });
  }
}
