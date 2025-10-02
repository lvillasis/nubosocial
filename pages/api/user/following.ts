// pages/api/user/following.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // `userId` es quien pide la lista de a quién sigue
    const userId = String(req.query.userId ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(req.query.perPage ?? 20)));

    if (!userId) return res.status(400).json({ error: "userId required" });

    // comprobar sesión para marcar si esos usuarios me siguen / si yo los sigo
    const session = await getServerSession(req, res, authOptions);
    let meId: string | null = null;
    if (session?.user) {
      meId = (session.user as any).id ?? null;
      if (!meId && session.user.email) {
        const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
        meId = me?.id ?? null;
      }
    }

    const [total, rows] = await Promise.all([
      prisma.userLike.count({ where: { likedById: userId } }),
      prisma.userLike.findMany({
        where: { likedById: userId },
        include: { user: { select: { id: true, username: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const following = rows.map((r) => r.user);

    // Si hay sesión, marcar si yo (meId) sigo a esos usuarios (para mostrar un botón "Dejar de seguir" / "Seguir")
    const followedByMeSet = new Set<string>();
    if (meId && following.length > 0) {
      const followingIds = following.map((f) => f.id);
      const myFollows = await prisma.userLike.findMany({
        where: { userId: { in: followingIds }, likedById: meId },
        select: { userId: true },
      });
      myFollows.forEach((m) => followedByMeSet.add(m.userId));
    }

    const result = following.map((f) => ({
      id: f.id,
      username: f.username,
      name: f.name,
      image: f.image,
      followedByMe: followedByMeSet.has(f.id),
    }));

    const totalPages = Math.ceil(total / perPage);
    const hasNextPage = page < totalPages;

    return res.status(200).json({ total, page, perPage, totalPages, hasNextPage, following: result });
  } catch (_err) {
    console.error("API /api/user/following error:", _err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
