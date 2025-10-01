// pages/api/posts/[id]/like.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { id: postId } = req.query;
  if (typeof postId !== "string") {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    // verificar que el post exista
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return res.status(404).json({ error: "Post no encontrado" });

    // obtener userId real
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // revisar si ya existe like (findFirst es seguro aquí)
    const existing = await prisma.like.findFirst({
      where: { postId, userId: user.id },
    });

    if (existing) {
      // Quitar like
      await prisma.like.delete({ where: { id: existing.id } });
      const likesCount = await prisma.like.count({ where: { postId } });
      return res.status(200).json({ liked: false, likesCount });
    } else {
      // Dar like - manejar posible P2002 (condición de carrera)
      try {
        await prisma.like.create({
          data: { postId, userId: user.id },
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          // unique constraint violated -> otro request ya creó el like simultáneamente
          // continuamos como si ya estuviera creado
        } else {
          throw err;
        }
      }
      const likesCount = await prisma.like.count({ where: { postId } });
      return res.status(200).json({ liked: true, likesCount });
    }
  } catch (error) {
    console.error("Error en like:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}
