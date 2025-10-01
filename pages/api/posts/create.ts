// pages/api/posts/create.ts
import { getServerSession } from "next-auth/next";
import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { content = "", image = "" } = req.body;

  const contentOk = typeof content === "string" && content.trim().length > 0;
  const imageOk = typeof image === "string" && image.length > 0;

  if (!contentOk && !imageOk) {
    return res.status(400).json({ error: "El contenido o la imagen son requeridos" });
  }

  const extractHashtags = (text: string) => text.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];
  const extractMentions = (text: string) => text.match(/@\w+/g)?.map(tag => tag.slice(1)) || [];

  const hashtags = extractHashtags(content);
  const mentions = extractMentions(content);

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const newPost = await prisma.post.create({
      data: {
        content: content.trim(),
        image: imageOk ? image : null,
        authorId: user.id,
        hashtags,
        mentions,
      },
      select: {
        id: true,
        content: true,
        image: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            author: {
              select: { name: true },
            },
          },
        },
      }
    });

    return res.status(201).json({ message: "Post creado exitosamente", post: newPost });
  } catch (error) {
    console.error("❌ Error al crear post:", error);
    return res.status(500).json({ error: "Error interno al crear el post" });
  }
}
