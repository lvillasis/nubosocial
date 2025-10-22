// /pages/api/check-username.ts
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username } = req.query;

    if (typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ available: false, message: "Nombre inválido" });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const exists = await prisma.user.findFirst({
      where: { username: normalizedUsername },
    });

    // Si no existe → disponible ✅
    return res.status(200).json({ available: !exists });
  } catch (error) {
    console.error("Error en /api/check-username:", error);
    return res.status(500).json({
      available: false,
      message: "Error interno del servidor",
    });
  }
}
