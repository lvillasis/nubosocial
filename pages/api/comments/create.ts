import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Método ${req.method} no permitido`);
  }

  const { postId, content } = req.body;
  const includePost = req.query.includePost === "true"; // ← parámetro opcional por query string

  if (!postId || typeof postId !== "string" || !content || typeof content !== "string") {
    return res.status(400).json({ error: "Faltan campos o datos inválidos" });
  }

  try {
    await prisma.comment.create({
      data: {
        content,
        post: { connect: { id: postId } },
        author: { connect: { email: session.user.email } },
      },
    });

    if (includePost) {
      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: { select: { name: true, image: true } },
          comments: {
            include: { author: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
          likes: true,
        },
      });

      if (!updatedPost) return res.status(404).json({ error: "Post no encontrado" });
      return res.status(200).json(updatedPost);
    }

    // Si no se pidió el post, solo devuelve el nuevo comentario
    const newComment = await prisma.comment.findFirst({
      where: {
        postId,
        content,
        author: { email: session.user.email },
      },
      include: {
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(newComment);
  } catch (_err) {
    console.error("❌ Error al guardar comentario:", err);
    return res.status(500).json({ error: "Error al guardar comentario" });
  }
}



