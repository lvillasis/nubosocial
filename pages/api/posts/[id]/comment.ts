// pages/api/posts/[id]/comment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

const DEFAULT_LIMIT = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method ?? "GET";

  // preferimos id en query (ruta /api/posts/[id]/comment)
  const idFromQuery = typeof req.query.id === "string" ? req.query.id : undefined;
  // por compatibilidad, aceptar postId en body si alguien lo envía
  const postIdFromBody = req.body && typeof req.body.postId === "string" ? req.body.postId : undefined;
  const postId = idFromQuery ?? postIdFromBody;

  if (!postId) return res.status(400).json({ error: "ID de post inválido" });

  // ----------------- GET: listar comentarios -----------------
  if (method === "GET") {
    try {
      console.log(`[comments] GET postId=${postId}`);
      // verificar existencia del post
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) return res.status(404).json({ error: "Post no encontrado" });

      const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : DEFAULT_LIMIT;
      const limit = isNaN(limitRaw) ? DEFAULT_LIMIT : Math.min(500, Math.max(1, limitRaw));

      const comments = await prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: "asc" }, // orden cronológico (cambia a desc si prefieres)
        take: limit,
        include: {
          author: { select: { id: true, username: true, name: true, image: true } },
        },
      });

      const out = comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.author.id,
          username: c.author.username,
          name: c.author.name ?? null,
          image: c.author.image ?? null,
        },
      }));

      return res.status(200).json({ comments: out });
    } catch (error) {
      console.error("[comments] GET error:", error);
      return res.status(500).json({ error: "Error interno" });
    }
  }

  // ----------------- POST: crear comentario -----------------
  if (method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session || (!session.user?.id && !session.user?.email)) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string" || content.trim() === "") {
        return res.status(400).json({ error: "El comentario no puede estar vacío" });
      }

      // resolver userId: preferir session.user.id, si no existe buscar por email
      let userId = session.user?.id as string | undefined;
      if (!userId && session.user?.email) {
        const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
        if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
        userId = u.id;
      }

      // verificar que exista el post
      const postExists = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!postExists) return res.status(404).json({ error: "Post no encontrado" });

      const trimmed = content.trim();
      const comment = await prisma.comment.create({
        data: {
          content: trimmed,
          postId: String(postId),
          authorId: userId!,
        },
        include: {
          author: { select: { id: true, username: true, name: true, image: true } },
        },
      });

      // respuesta compatible con lo que ya devolvías (mismo shape)
      // -> Devuelve el comment creado incluyendo author (id, name, username, image)
      // Si el cliente desea el post completo actualizado, puede enviar ?includePost=true
      if (String(req.query.includePost) === "true") {
        // devolver post con comments y likes si se pide (útil para UIs que esperan el post completo)
        const updatedPost = await prisma.post.findUnique({
          where: { id: postId },
          include: {
            author: { select: { id: true, username: true, name: true, image: true } },
            comments: {
              include: { author: { select: { id: true, username: true, name: true, image: true } } },
              orderBy: { createdAt: "asc" },
            },
            likes: true,
          },
        });

        if (!updatedPost) return res.status(404).json({ error: "Post no encontrado tras crear el comentario" });
        // Normalizar createdAt a ISO para compatibilidad
        const normalized = {
          ...updatedPost,
          comments: updatedPost.comments.map((c: any) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
            author: {
              id: c.author.id,
              username: c.author.username,
              name: c.author.name ?? null,
              image: c.author.image ?? null,
            },
          })),
        };
        return res.status(200).json(normalized);
      }

      return res.status(200).json(comment);
    } catch (error) {
      console.error("[comments] POST error:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${method} no permitido` });
}
