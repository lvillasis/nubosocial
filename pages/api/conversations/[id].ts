// pages/api/conversations/[id].ts
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
    console.error("User lookup error:", _err);
    return res.status(500).json({ error: "DB error" });
  }
  if (!user) return res.status(401).json({ error: "User not found" });

  const { id } = req.query;
  const convId = String(id ?? "");
  if (!convId) return res.status(400).json({ error: "Conversation id required" });

  try {
    if (req.method === "GET") {
      const conv = await prisma.conversation.findUnique({
        where: { id: convId },
        include: {
          participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { id: true, name: true, username: true, image: true } } } },
        },
      });
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      const isParticipant = conv.participants?.some((p: any) => String(p.userId ?? p.user?.id ?? "") === String(user.id));
      if (!isParticipant) return res.status(403).json({ error: "Not a participant" });

      const lastMessage = Array.isArray(conv.messages) && conv.messages.length ? conv.messages[0] : null;
      return res.status(200).json({ ...conv, lastMessage });
    }

    if (req.method === "DELETE") {
      const conv = await prisma.conversation.findFirst({
        where: { id: convId, participants: { some: { userId: user.id } } },
      });
      if (!conv) return res.status(404).json({ error: "Conversation not found or not allowed" });

      await prisma.conversation.delete({ where: { id: conv.id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Conversations [id] API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
