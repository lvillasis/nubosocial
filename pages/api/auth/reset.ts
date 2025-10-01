// pages/api/auth/reset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { hashTokenSHA256, hashPassword } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { id, token, password } = req.body as { id?: string; token?: string; password?: string };
  if (!id || !token || !password) return res.status(400).json({ error: "Missing parameters" });

  try {
    const row = await prisma.passwordResetToken.findUnique({ where: { id } });
    if (!row) return res.status(400).json({ error: "Invalid or expired token" });
    if (row.used) return res.status(400).json({ error: "Token already used" });
    if (row.expiresAt < new Date()) return res.status(400).json({ error: "Token expired" });

    const tokenHash = hashTokenSHA256(token);
    if (tokenHash !== row.tokenHash) return res.status(400).json({ error: "Invalid token" });

    const newHash = await hashPassword(password);
    await prisma.user.update({ where: { id: row.userId }, data: { password: newHash } });

    await prisma.passwordResetToken.update({ where: { id }, data: { used: true } });

    // opcional: invalidar sesiones existentes
    await prisma.session.deleteMany({ where: { userId: row.userId } });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("reset error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
