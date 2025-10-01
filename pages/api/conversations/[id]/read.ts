// pages/api/conversations/[id]/read.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const conversationId = String(req.query.id || "");
  if (!conversationId) return res.status(400).json({ error: "conversation id required" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: "User not found" });

  try {
    // Update the conversationParticipant.lastReadAt for this user
    const result = await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId: user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    if (result.count === 0) {
      // user is not a participant (or record missing)
      return res.status(403).json({ error: "Not a participant of this conversation" });
    }

    return res.status(200).json({ ok: true, updated: result.count });
  } catch (err: any) {
    console.error("Mark read error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
