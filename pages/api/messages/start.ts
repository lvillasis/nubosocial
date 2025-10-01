// pages/api/messages/start.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: "Not authenticated" });

    // Obtener currentUserId del session (o buscar por email si hace falta)
    let currentUserId: string | null = (session.user as any)?.id ?? null;
    if (!currentUserId && session.user.email) {
      const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      currentUserId = u?.id ?? null;
    }
    if (!currentUserId) return res.status(401).json({ error: "User id not found in session" });

    const { targetId } = req.body as { targetId?: string };
    if (!targetId) return res.status(400).json({ error: "targetId is required" });
    if (targetId === currentUserId) return res.status(400).json({ error: "Cannot start conversation with yourself" });

    // Buscar conversación 1:1 existente (isGroup = false y que contenga ambos participantes)
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetId } } }
        ]
      },
      include: { participants: true }
    });

    if (existing) {
      return res.status(200).json({ conversationId: existing.id });
    }

    // Crear nueva conversación 1:1
    const created = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: currentUserId }, { userId: targetId }]
        }
      }
    });

    return res.status(201).json({ conversationId: created.id });
  } catch (_err) {
    console.error("API /api/messages/start error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
