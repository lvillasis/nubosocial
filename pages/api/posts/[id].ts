// pages/api/posts/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { v2 as cloudinary } from "cloudinary";

/**
 * Extrae public_id de una URL típica de Cloudinary.
 * Soporta URLs con /upload/v123/... y quita la extension.
 */
function getCloudinaryPublicIdFromUrl(url: string) {
  try {
    const idx = url.indexOf("/upload/");
    if (idx === -1) return null;
    let tail = url.substring(idx + "/upload/".length);
    // quitar version si existe: v123/
    if (/^v\d+\//.test(tail)) {
      const firstSlash = tail.indexOf("/");
      if (firstSlash !== -1) tail = tail.substring(firstSlash + 1);
    }
    // quitar query
    const q = tail.indexOf("?");
    if (q !== -1) tail = tail.substring(0, q);
    // quitar extensión (.jpg .png ...)
    const lastDot = tail.lastIndexOf(".");
    if (lastDot !== -1) tail = tail.substring(0, lastDot);
    return tail;
  } catch (e) {
    return null;
  }
}

// Config Cloudinary (si no usas Cloudinary no romperá la ruta - solo no borrará imagen)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "ID inválido" });

  try {
    // import dinámico de prisma para acomodar export default o named export
    const maybe = await import("@/lib/prisma");
    // intentar varios patrones de export
    const prisma = (maybe?.prisma ?? maybe?.default ?? maybe) as any;

    // Obtener sesión
    const session = await getServerSession(req, res, authOptions);

    // obtener currentUserId: preferir session.user.id, si no existe buscar por email
    let currentUserId: string | null = (session as any)?.user?.id ?? null;
    if (!currentUserId && (session as any)?.user?.email) {
      const userFound = await prisma.user.findUnique({
        where: { email: (session as any).user.email },
        select: { id: true },
      });
      currentUserId = userFound?.id ?? null;
    }

    if (req.method === "GET") {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: { select: { id: true, name: true, username: true, image: true } },
          likes: { select: { userId: true } },
        },
      });
      if (!post) return res.status(404).json({ error: "Post no encontrado" });

      const comments = await prisma.comment.findMany({
        where: { postId: id },
        include: { author: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({
        id: post.id,
        content: post.content,
        image: post.image ?? null,
        hashtags: post.hashtags ?? [],
        mentions: post.mentions ?? [],
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        likesCount: (post.likes ?? []).length,
        liked: currentUserId ? (post.likes ?? []).some((l: any) => l.userId === currentUserId) : false,
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          author: c.author,
        })),
      });
    }

    if (req.method === "DELETE") {
      // only author can delete
      if (!session?.user) return res.status(401).json({ error: "No autorizado" });
      if (!currentUserId) return res.status(401).json({ error: "No se pudo identificar al usuario" });

      const post = await prisma.post.findUnique({
        where: { id },
        select: { id: true, authorId: true, image: true },
      });

      if (!post) return res.status(404).json({ error: "Post no encontrado" });
      if (post.authorId !== currentUserId) return res.status(403).json({ error: "No tienes permiso" });

      // intentar borrar la imagen en Cloudinary si detectamos URL
      if (post.image) {
        const publicId = getCloudinaryPublicIdFromUrl(post.image);
        if (publicId && process.env.CLOUDINARY_API_KEY) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
          } catch (_err) {
            console.warn("Cloudinary destroy error (se continúa):", err);
          }
        }
      }

      await prisma.post.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err: any) {
    console.error("Error en /api/posts/[id]:", err);
    return res.status(500).json({ error: "Error interno del servidor", details: err?.message });
  }
}
