// pages/api/hashtag/follow.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

type Data =
  | { error: string }
  | { following: boolean };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { tag } = req.body;
  if (!tag || typeof tag !== "string") return res.status(400).json({ error: "Tag no válido" });

  // Normalizar tag (sin # y trimmed)
  const cleanTag = String(tag).replace(/^#/, "").trim();
  if (!cleanTag) return res.status(400).json({ error: "Tag vacío después de limpiar" });

  // --- Comprobación defensiva: existe el modelo / tabla HashtagFollow? ---
  try {
    const modelMap = (prisma as any)?._dmmf?.modelMap;
    let found = false;

    if (modelMap && modelMap.HashtagFollow) {
      // Prisma client conoce el modelo por dmmf
      found = true;
    } else {
      // Fallback: comprobar en la base de datos (information_schema / to_regclass)
      try {
        // Intentamos con to_regclass casteado a text (varios drivers devuelven tipos distintos)
        const regRaw = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."HashtagFollow"')::text AS reg;`);
        const regVal = Array.isArray(regRaw) && regRaw.length > 0 ? regRaw[0].reg : null;
        if (regVal) {
          found = true;
        } else {
          // fallback a information_schema
          const existsRaw = await prisma.$queryRawUnsafe(
            `SELECT EXISTS(
               SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND (table_name = 'HashtagFollow' OR table_name = 'hashtagfollow')
             ) AS found;`
          );

          // Normalizar el posible resultado
          if (Array.isArray(existsRaw) && existsRaw.length > 0) {
            const row = existsRaw[0];
            const val = Object.prototype.hasOwnProperty.call(row, "found") ? row.found : Object.values(row)[0];
            if (val === true || val === "t" || val === "1" || val === 1 || String(val).toLowerCase() === "true") {
              found = true;
            }
          }
        }
      } catch (e) {
        // Si falla la comprobación DB no asumimos que existe
        console.warn("Warning: fallo al comprobar existencia de HashtagFollow:", e);
        found = false;
      }
    }

    if (!found) {
      return res.status(501).json({
        error: "Funcionalidad no disponible: tabla HashtagFollow no existe. Ejecuta `prisma db push` o aplica migraciones y regenera el cliente.",
      });
    }
  } catch (_err) {
    console.error("Error comprobando modelo HashtagFollow:", _err);
    return res.status(500).json({ error: "Error interno al comprobar la base de datos" });
  }

  // --- Operación de toggle follow ---
  try {
    // Buscar usuario por email para obtener su id
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Acceso dinámico al modelo por si el client no se regeneró
    const hashtagModel =
      (prisma as any).hashtagFollow ?? (prisma as any).HashtagFollow ?? (prisma as any)["hashtagFollow"] ?? null;

    if (!hashtagModel || typeof hashtagModel.findFirst !== "function") {
      return res.status(500).json({
        error: "Prisma client no expone HashtagFollow. Ejecuta `npx prisma generate` y reinicia el servidor.",
      });
    }

    // Verificar si ya sigue el tag
    const existing = await hashtagModel.findFirst({ where: { userId: user.id, tag: cleanTag } });

    if (existing) {
      await hashtagModel.delete({ where: { id: existing.id } });
      return res.status(200).json({ following: false });
    } else {
      await hashtagModel.create({ data: { userId: user.id, tag: cleanTag } });
      return res.status(200).json({ following: true });
    }
  } catch (err: any) {
    console.error("Error follow tag:", err);
    // Manejo específico de errores Prisma si aparecen
    if (err?.code === "P2021") {
      return res.status(500).json({ error: "Tabla HashtagFollow no encontrada en la base de datos (P2021)." });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
