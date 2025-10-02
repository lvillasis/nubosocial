// pages/api/posts/index.ts
import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Prisma } from "@prisma/client";
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
      const includeBase: Prisma.PostInclude = {
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
        // incluir likes para este userId (para saber si lo ha liked)
        const includeWithLikes: Prisma.PostInclude = {
          ...includeBase,
          likes: { where: { userId }, select: { id: true, userId: true } },
        };

        const posts = await prisma.post.findMany({
          orderBy: { createdAt: "desc" },
          include: includeWithLikes,
        });

        const formattedPosts = posts.map((post) => ({
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          author: post.author,
          image: post.image,
          likesCount: post._count?.likes ?? 0,
          // aquí post.likes existe porque pedimos includeWithLikes
          liked: (Array.isArray((post as any).likes) ? (post as any).likes.length : 0) > 0,
          comments: post.comments ?? [],
        }));

        return res.status(200).json(formattedPosts);
      } else {
        // sin userId no pedimos likes
        const posts = await prisma.post.findMany({
          orderBy: { createdAt: "desc" },
          include: includeBase,
        });

        const formattedPosts = posts.map((post) => ({
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          author: post.author,
          image: post.image,
          likesCount: post._count?.likes ?? 0,
          // no pedimos 'likes' en este query -> asumimos que el usuario no ha "liked"
          liked: false,
          comments: post.comments ?? [],
        }));

        return res.status(200).json(formattedPosts);
      }
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

      // traer el post completo incluyendo _count, comments y likes (para este user)
      const fullInclude: Prisma.PostInclude = {
        author: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId }, select: { id: true, userId: true } },
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

      const fullPost = await prisma.post.findUnique({
        where: { id: newPost.id },
        include: fullInclude,
      });

      if (!fullPost) return res.status(500).json({ error: "No se pudo recuperar el post recién creado" });

      const formattedPost = {
        id: fullPost.id,
        content: fullPost.content,
        createdAt: fullPost.createdAt,
        author: fullPost.author,
        image: fullPost.image,
        likesCount: fullPost._count?.likes ?? 0,
        // liked: true si el array likes (incluido para este user) tiene elementos
        liked: (Array.isArray((fullPost as any).likes) ? (fullPost as any).likes.length : 0) > 0,
        comments: fullPost.comments ?? [],
      };

      return res.status(201).json(formattedPost);
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("API /api/posts error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
