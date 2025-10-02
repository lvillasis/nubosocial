// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { hashRefreshToken, verifyPassword } from "@/lib/auth";

// Tipar las constantes de entorno
const ACCESS_TOKEN_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET as string;
const ACCESS_TOKEN_EXP: string | number = process.env.ACCESS_TOKEN_EXP || "15m";
const REFRESH_TOKEN_BYTES = 48;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, remember } = req.body as {
    email: string;
    password: string;
    remember?: boolean;
  };

  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Generar access token (JWT)
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXP } as SignOptions
    );

    // Crear refresh token en claro y su hash
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
    const tokenHash = hashRefreshToken(refreshToken);

    const expiresMs = remember ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000; // 30d vs 1d
    const expiresAt = new Date(Date.now() + expiresMs);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Setear cookie HttpOnly con el refresh token
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("nubo_refresh", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: remember ? 30 * 24 * 3600 : undefined, // segundos
      })
    );

    return res.status(200).json({ ok: true, accessToken, redirectTo: "/profile" });
  } catch (_err) {
    console.error("login error:", _err);
    return res.status(500).json({ error: "Server error" });
  }
}
