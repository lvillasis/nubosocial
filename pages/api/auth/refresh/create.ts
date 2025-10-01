// pages/api/auth/refresh/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { serialize } from "cookie";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { hashRefreshToken } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !(session as any).user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = (session as any).user.id as string;
    const { remember } = (req.body as { remember?: boolean }) ?? {};

    // generar token en claro
    const refreshToken = randomBytes(48).toString("hex");

    // calcular hash (tu función es sincrónica: sha256)
    const tokenHash = hashRefreshToken(refreshToken);

    const expiresMs = remember ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
    const expiresAt = new Date(Date.now() + expiresMs);

    // guardar en BD y obtener id
    const dbToken = await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        used: false,
      },
    });

    // cookie en formato id:token -> facilita validar por id
    const cookieValue = `${dbToken.id}:${refreshToken}`;

    const serialized = serialize("nubo_refresh", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 30 * 24 * 3600 : undefined, // segundos
    });

    res.setHeader("Set-Cookie", serialized);
    return res.status(200).json({ ok: true });
  } catch (_err) {
    console.error("error creating refresh token:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
