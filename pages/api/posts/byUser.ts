// pages/api/posts/byUser.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, limit = "10", cursor } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId requerido" });
    }

    const take = Math.min(50, Number(limit) || 10); // límite razonable
    const takePlusOne = take + 1;

    const findOptions: any = {
      where: { authorId: userId },
      include: {
        author: {
          select: { id: true, username: true, name: true, image: true },
        },
        likes: true,       // tu modelo Like existe
        comments: true,    // tu modelo Comment existe
        // <-- NO incluyas `retweets` porque no existe en tu schema
      },
      orderBy: { createdAt: "desc" as const },
      take: takePlusOne,
    };

    // cursor pagination (opcional)
    if (cursor && typeof cursor === "string") {
      findOptions.cursor = { id: cursor };
      findOptions.skip = 1;
    }

    const rows = await prisma.post.findMany(findOptions);

    // paginado: si vino take+1 => hay nextCursor
    const hasMore = rows.length === takePlusOne;
    const posts = rows.slice(0, take);

    const nextCursor = hasMore ? posts[posts.length - 1].id : null;

    return res.status(200).json({ posts, nextCursor });
  } catch (err: any) {
    console.error("byUser error:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
