// pages/api/conversations/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const sessUser = session.user as any;
  let user = null;
  try {
    if (sessUser?.id) user = await prisma.user.findUnique({ where: { id: String(sessUser.id) } });
    if (!user && sessUser?.email) user = await prisma.user.findUnique({ where: { email: String(sessUser.email) } });
  } catch (_err) {
    console.error("User lookup error:", err);
    return res.status(500).json({ error: "DB error" });
  }
  if (!user) return res.status(401).json({ error: "User not found" });

  try {
    if (req.method === "GET") {
      // lista conversaciones en las que participa el usuario, con preview
      const convs = await prisma.conversation.findMany({
        where: { participants: { some: { userId: user.id } } },
        orderBy: { updatedAt: "desc" },
        include: {
          participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true, username: true, image: true } } } },
        },
      });

      // normalizar: devolver lastMessage y participants shape fácil
      const normalized = convs.map((c) => ({
        ...c,
        lastMessage: Array.isArray(c.messages) && c.messages.length ? c.messages[0] : null,
      }));
      return res.status(200).json(normalized);
    }

    if (req.method === "POST") {
      // crear conversación (el frontend manda { userIds: [id] } para 1:1)
      const body = req.body || {};
      const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.map(String) : [];

      // si no se pasan userIds, error
      if (userIds.length === 0) return res.status(400).json({ error: "userIds required" });

      // crear conversación 1:1 si sólo un user id
      if (userIds.length === 1) {
        const targetId = String(userIds[0]);
        // evitar crear duplicado
        const existing = await prisma.conversation.findFirst({
          where: {
            isGroup: false,
            AND: [
              { participants: { some: { userId: user.id } } },
              { participants: { some: { userId: targetId } } },
            ],
          },
        });
        if (existing) return res.status(200).json(existing);

        const created = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: { create: [{ userId: user.id }, { userId: targetId }] },
          },
          include: { participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } } },
        });
        return res.status(201).json(created);
      }

      // creación de grupo simple
      const created = await prisma.conversation.create({
        data: {
          isGroup: true,
          title: body.title ?? null,
          participants: { create: [{ userId: user.id }, ...userIds.map((id) => ({ userId: id }))] },
        },
        include: { participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } } },
      });
      return res.status(201).json(created);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Conversations index API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
