// pages/api/auth/refresh/consume.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import prisma from "@/lib/prisma";
import { hashRefreshToken, markRefreshTokenUsed } from "@/lib/auth"; // markRefreshTokenUsed ya tienes
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // leer cookie
    const cookies = parse(req.headers.cookie || "");
    const raw = cookies["nubo_refresh"];
    if (!raw) return res.status(401).json({ error: "No refresh cookie" });

    const parts = raw.split(":");
    if (parts.length !== 2) return res.status(400).json({ error: "Invalid token format" });

    const [id, token] = parts;
    const row = await prisma.refreshToken.findUnique({ where: { id } });
    if (!row) return res.status(401).json({ error: "Token not found" });
    if (row.used) return res.status(401).json({ error: "Token already used" });
    if (row.expiresAt < new Date()) return res.status(401).json({ error: "Token expired" });

    const tokenHash = hashRefreshToken(token);
    if (tokenHash !== row.tokenHash) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // MARCAR como usado (o eliminar). Aquí lo marcamos:
    await markRefreshTokenUsed(id);

    // TODO: crear nueva sesión / tokens según tu flujo NextAuth
    // Por ejemplo: forzar nueva sesión, o emitir cookies de sesión aquí.
    // Si usas NextAuth con JWT/session, puedes devolver ok y el cliente pedirá /api/auth/session.

    return res.status(200).json({ ok: true });
  } catch (_err) {
    console.error("consume refresh error:", _err);
    return res.status(500).json({ error: "Server error" });
  }
}
