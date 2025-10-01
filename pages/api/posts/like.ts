// pages/api/posts/like.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📩 POST /api/posts/like");

  const session = await getServerSession(req, res, authOptions);

  // Verificar autenticación
  if (!session?.user?.email) {
    console.warn("🚫 Usuario no autenticado");
    return res.status(401).json({ error: "No autorizado" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  const { postId } = req.body;
  console.log("🆔 postId recibido:", postId);
  console.log("👤 Email en sesión:", session.user.email);

  if (!postId || typeof postId !== "string") {
    console.warn("⚠️ postId inválido");
    return res.status(400).json({ error: "postId inválido" });
  }

  try {
    // Verificar usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.warn("🚫 Usuario no encontrado en DB:", session.user.email);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    console.log("✅ Usuario encontrado:", user);

    // Verificar post
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!postExists) {
      console.warn("🚫 Post no encontrado:", postId);
      return res.status(404).json({ error: "Post no encontrado" });
    }
    console.log("✅ Post encontrado:", postExists.id);

    // Buscar like existente
    const existingLike = await prisma.like.findFirst({
      where: {
        postId,
        userId: user.id,
      },
    });

    if (existingLike) {
      console.log("🗑 Quitando like:", existingLike.id);
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
    } else {
      console.log("➕ Agregando like:", { postId, userId: user.id });
      await prisma.like.create({
        data: {
          postId,
          userId: user.id,
        },
      });
    }

    // Contar likes actualizados
    const totalLikes = await prisma.like.count({
      where: { postId },
    });

    console.log("📊 Total likes ahora:", totalLikes);

    return res.status(200).json({
      liked: !existingLike,
      likesCount: totalLikes,
    });
  } catch (error) {
    console.error("💥 Error en like:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
