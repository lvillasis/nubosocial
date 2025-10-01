// /pages/api/check-username.ts
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query;

  if (typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({ available: false, message: "Nombre inválido" });
  }

  try {
    const exists = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    return res.status(200).json({ available: !exists });
  } catch (error) {
    console.error("Error al verificar username:", error);
    return res.status(500).json({ available: false, message: "Error del servidor" });
  }
}


