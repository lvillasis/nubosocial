// pages/api/hashtag/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tag } = req.query;

  if (!tag || typeof tag !== "string") {
    return res.status(400).json({ error: "Hashtag inválido" });
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        content: {
          contains: `#${tag}`, // Busca hashtags tipo "#react"
          mode: "insensitive", // No distingue mayúsculas/minúsculas
        },
      },
      include: {
        author: { select: { name: true, image: true, username: true } },
        likedBy: { select: { id: true } },
        comments: {
          include: {
            author: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Error al buscar hashtag:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
}
