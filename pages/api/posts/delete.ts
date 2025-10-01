// pages/api/posts/delete.ts
import { getServerSession } from "next-auth";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { postId } = req.body;

  try {
    // Busca el post para verificar si el usuario actual es el autor
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || post.authorId !== user.id) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este post" });
    }

    // Eliminar comentarios relacionados (si quieres borrar en cascada manualmente)
    await prisma.comment.deleteMany({
      where: { postId },
    });

    // Eliminar likes relacionados (opcional)
    await prisma.like.deleteMany({
      where: { postId },
    });

    // Finalmente, eliminar el post
    await prisma.post.delete({
      where: { id: postId },
    });

    return res.status(200).json({ message: "Post eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar el post:", error);
    return res.status(500).json({ error: "Error del servidor" });
  }
}

