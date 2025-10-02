// pages/api/auth/refresh.ts
import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import {
  hashRefreshToken,
  findRefreshTokenRecordByToken,
  markRefreshTokenUsed,
} from "@/lib/auth";

// Tipar las constantes de entorno
const ACCESS_TOKEN_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET as string;
const ACCESS_TOKEN_EXP: string | number = process.env.ACCESS_TOKEN_EXP || "15m";
const REFRESH_TOKEN_BYTES = 48;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const refreshToken = cookies["nubo_refresh"];
    if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

    const record = await findRefreshTokenRecordByToken(refreshToken);
    if (!record) return res.status(401).json({ error: "Invalid refresh token" });

    if (record.used) return res.status(401).json({ error: "Refresh token already used" });
    if (record.expiresAt <= new Date()) return res.status(401).json({ error: "Refresh token expired" });

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) return res.status(401).json({ error: "Invalid token" });

    // Marcar el token antiguo como usado (revocar)
    await markRefreshTokenUsed(record.id);

    // Nuevo access token
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXP } as SignOptions
    );

    // Rotación: crear nuevo refresh token
    const newRefreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
    const newHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30d

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt: newExpiresAt,
      },
    });

    // Setear la cookie con el nuevo refresh token
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("nubo_refresh", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 3600, // segundos
      })
    );

    return res.status(200).json({ accessToken });
  } catch (_err) {
    console.error("refresh error:", _err);
    return res.status(500).json({ error: "Server error" });
  }
}
