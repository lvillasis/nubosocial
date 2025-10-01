import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: "No autorizado" });
  }

  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          bio: true,
          location: true,
          image: true,
          coverImage: true,
          email: true,
          darkMode: true,
          language: true,
          emailNotifications: true,
        },
      });

      return res.status(200).json(user);
    } catch (_err) {
      console.error("❌ Error cargando usuario:", err);
      return res.status(500).json({ message: "Error al cargar usuario" });
    }
  }

  if (req.method === "POST") {
    const { name, bio, location, image, coverImage, darkMode, language, emailNotifications } = req.body;

    try {
      const updatedUser = await prisma.user.update({
        where: { email: session.user.email },
        data: {
          ...(name ? { name } : {}),
          ...(bio ? { bio } : {}),
          ...(location ? { location } : {}),
          ...(image ? { image } : {}),
          ...(coverImage ? { coverImage } : {}),
          ...(typeof darkMode === "boolean" ? { darkMode } : {}),
          ...(language ? { language } : {}),
          ...(typeof emailNotifications === "boolean" ? { emailNotifications } : {}),
        },
        select: {
          id: true,
          name: true,
          bio: true,
          location: true,
          image: true,
          coverImage: true,
          email: true,
          darkMode: true,
          language: true,
          emailNotifications: true,
        },
      });

      return res.status(200).json({ message: "Perfil actualizado", user: updatedUser });
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  return res.status(405).json({ message: "Método no permitido" });
}
