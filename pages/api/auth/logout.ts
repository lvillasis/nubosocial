// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // 1. Obtener usuario de la sesión JWT
    const token = await getToken({ req });
    if (!token || !token.sub) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const userId = token.sub;

    // 2. Borrar los refresh tokens de este usuario
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 3. Limpiar cookie en el navegador
    res.setHeader("Set-Cookie", [
      serialize("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0), // Expirada
      }),
    ]);

    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (_err) {
    console.error("Error en logout:", _err);
    return res.status(500).json({ error: "Error cerrando sesión" });
  }
}
