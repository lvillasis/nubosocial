// pages/api/auth/forgot.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { hashTokenSHA256 } from "@/lib/auth";
import { sendResetEmail } from "@/lib/mail";

const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1h

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Email required" });

  // Respuesta genérica para no filtrar emails
  const genericOk = { ok: true };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json(genericOk);

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashTokenSHA256(token);
    const expiresAt = new Date(Date.now() + RESET_EXPIRES_MS);

    const dbToken = await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const resetUrl = `${base}/reset-password?id=${dbToken.id}&token=${token}`;

    await sendResetEmail(email, resetUrl);

    return res.status(200).json(genericOk);
  } catch (_err) {
    console.error("forgot error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
