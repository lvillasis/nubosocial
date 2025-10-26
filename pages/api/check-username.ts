// ✅ /pages/api/check-username.ts
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ available: false, message: "Método no permitido" });
  }

  try {
    const { username } = req.query;

    if (typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ available: false, message: "Nombre de usuario inválido" });
    }

    // 🔹 Normaliza el username a minúsculas
    const cleanUsername = username.trim().toLowerCase();

    // 🔹 Busca usuario exacto (usando el índice único de Prisma)
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(200).json({
        available: false,
        message: "El nombre de usuario ya está en uso",
      });
    }

    return res.status(200).json({
      available: true,
      message: "Nombre disponible",
    });
  } catch (error) {
    console.error("❌ Error al verificar username:", error);
    return res.status(500).json({
      available: false,
      message: "Error interno del servidor",
    });
  }
}
