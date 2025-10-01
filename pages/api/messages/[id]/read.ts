// pages/api/messages/[id]/read.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/authOptions";
import prisma from "../../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized - no session" });

  // Try to find user by id (if available on session) or by email
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

  const messageId = String(req.query.id ?? "");
  if (!messageId) return res.status(400).json({ error: "message id required" });

  try {
    if (req.method === "POST") {
      const existing = await prisma.messageRead.findFirst({ where: { messageId, userId: user.id } });
      if (existing) {
        const updated = await prisma.messageRead.update({ where: { id: existing.id }, data: { readAt: new Date() } });
        return res.status(200).json(updated);
      } else {
        const created = await prisma.messageRead.create({ data: { messageId, userId: user.id, readAt: new Date() } });
        return res.status(201).json(created);
      }
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("MessageRead API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
