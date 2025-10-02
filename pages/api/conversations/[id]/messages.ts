// pages/api/conversations/[id]/messages.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import rl from "@/lib/rateLimiter";

const MessageSchema = z.object({
  content: z.string().min(1).max(2000).nullable().optional(),
  attachment: z.string().url().nullable().optional(),
  replyToId: z.string().nullable().optional(),
});
  
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const conversationId = String(req.query.id ?? "");
  if (!conversationId) return res.status(400).json({ error: "conversation id required" });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const sessUser = session.user as any;
  let currentUser = null;
  try {
    if (sessUser?.id) currentUser = await prisma.user.findUnique({ where: { id: String(sessUser.id) } });
    if (!currentUser && sessUser?.email) currentUser = await prisma.user.findUnique({ where: { email: String(sessUser.email) } });
  } catch (_err) {
    console.error("User lookup error:", _err);
    return res.status(500).json({ error: "DB error" });
  }
  if (!currentUser) return res.status(401).json({ error: "User not found" });
  const currentUserId = currentUser.id;

  if (req.method === "GET") {
    try {
      const limit = Math.min(200, Number(req.query.limit || 200));
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: limit,
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      });
      return res.status(200).json(messages);
    } catch (_err) {
      console.error("GET messages error:", _err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });

    const { content = null, attachment = null, replyToId = null } = parsed.data;
    if ((content === null || String(content).trim() === "") && !attachment) {
      return res.status(400).json({ error: "Mensaje vacío: content o attachment requerido" });
    }

    // rate limiter (fail-open if rl errors)
    try {
      await rl.consume(String(currentUserId));
    } catch (err: any) {
      if (err && (err.msBeforeNext || err.remainingPoints !== undefined)) {
        return res.status(429).json({ error: "Rate limit exceeded", msBeforeNext: err.msBeforeNext ?? 0 });
      }
      console.warn("[messages] rate limiter error (allowing):", err?.message ?? err);
    }

    // verify participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: currentUserId },
    });
    if (!participant) return res.status(403).json({ error: "Not a participant of this conversation" });

    const sanitizedContent = content ? sanitizeHtml(String(content), { allowedTags: [], allowedAttributes: {} }).trim() : null;

    try {
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: currentUserId,
          content: sanitizedContent,
          attachment: attachment ?? null,
          replyToId: replyToId ?? null,
        },
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      });

      // update conversation timestamp (so listing orders by updatedAt)
      await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

      return res.status(201).json(message);
    } catch (_err) {
      console.error("Create message error:", _err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
