// pages/api/user/[username].ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const uname = Array.isArray(username) ? username[0] : username;
  if (!uname) return res.status(400).json({ success: false, message: "Missing username" });

  try {
    const user = await prisma.user.findUnique({
      where: { username: uname },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        coverImage: true,
        bio: true,
        location: true,
      },
    });

    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    return res.status(200).json({ success: true, user });
  } catch (_err) {
    console.error("API /api/user/[username] error:", err);
    return res.status(500).json({ success: false, message: "DB error", error: String(err) });
  }
}
