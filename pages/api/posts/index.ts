// pages/api/posts/index.ts
import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Intenta obtener sesión (si existe). No abortamos si no hay sesión.
    const session = await getServerSession(req, res, authOptions);
    let userId: string | null = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (user) userId = user.id;
    }

    if (req.method === "GET") {
      // Construimos el include dinámicamente: si hay userId incluimos likes para ese usuario
      const includeObj: any = {
        author: {
          select: { id: true, name: true, username: true, image: true },
        },
        _count: { select: { likes: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true, username: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      };

      if (userId) {
        includeObj.likes = {
          where: { userId },
          select: { id: true },
        };
      }

      const posts = await prisma.post.findMany({
        orderBy: { createdAt: "desc" },
        include: includeObj,
      });

      const formattedPosts = posts.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        author: post.author,
        image: post.image,
        likesCount: post._count?.likes ?? 0,
        liked: Array.isArray(post.likes) ? post.likes.length > 0 : false,
        comments: post.comments ?? [],
      }));

      return res.status(200).json(formattedPosts);
    }

    if (req.method === "POST") {
      // POST requiere sesión (y userId)
      if (!userId) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { content } = req.body;
      if (typeof content !== "string" || content.trim() === "") {
        return res.status(400).json({ error: "Contenido vacío o inválido" });
      }

      const newPost = await prisma.post.create({
        data: { content: content.trim(), authorId: userId },
      });

      const fullPost = await prisma.post.findUnique({
        where: { id: newPost.id },
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { likes: true } },
          likes: { where: { userId }, select: { id: true } },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: { select: { id: true, name: true, username: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      const formattedPost = {
        id: fullPost!.id,
        content: fullPost!.content,
        createdAt: fullPost!.createdAt,
        author: fullPost!.author,
        image: fullPost!.image,
        likesCount: fullPost!._count?.likes ?? 0,
        liked: fullPost!.likes?.length > 0 ?? false,
        comments: fullPost!.comments ?? [],
      };

      return res.status(201).json(formattedPost);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("API /api/posts error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
