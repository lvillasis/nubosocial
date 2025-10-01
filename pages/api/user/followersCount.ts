// pages/api/user/followersCounts.ts  (modo DEBUG temporal)
console.log("[followCounts DEBUG init] file cargado");

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const qUserId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
  const debug = String(req.query.debug ?? "");

  try {
    // 1) mostrar fragmento de DATABASE_URL (ocultando password)
    const dbUrl = String(process.env.DATABASE_URL ?? "");
    const sanitized = dbUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
    console.log("[followCounts DEBUG] DB URL (sanitized):", sanitized.slice(0, 140));

    if (!qUserId) {
      return res.status(400).json({ success: false, message: "Falta userId", hint: "envía ?userId=..." });
    }

    // 2) intento normal de findUnique
    const found = await prisma.user.findUnique({
      where: { id: String(qUserId) },
      select: { id: true, username: true },
    });

    // 3) datos DB actuales vía SQL (current_database/current_user)
    let dbinfo = null;
    try {
      dbinfo = await prisma.$queryRaw`SELECT current_database() AS db, current_user AS user`;
    } catch (e) {
      console.warn("[followCounts DEBUG] fallo dbinfo:", e);
      dbinfo = { error: String(e) };
    }

    // 4) raw select from public.users with the given id (para ver si Prisma ve la tabla)
    let rawUser = null;
    try {
      rawUser = await prisma.$queryRaw`SELECT id, username FROM public.users WHERE id = ${String(qUserId)} LIMIT 1`;
    } catch (e) {
      console.warn("[followCounts DEBUG] fallo rawUser:", e);
      rawUser = { error: String(e) };
    }

    // Si está en modo debug devolvemos detalles JSON (no dejar así en prod)
    if (debug === "1") {
      return res.status(200).json({
        success: true,
        envSnippet: sanitized.slice(0, 140),
        dbinfo,
        findUniqueResult: found ?? null,
        rawUserResult: rawUser ?? null,
      });
    }

    // Modo normal: si no existe -> 404
    if (!found) {
      console.log("[followCounts] findUnique no halló usuario con id:", qUserId);
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    // Si existe: cuentas (tu lógica original)
    const followersCount = await prisma.userLike.count({ where: { userId: found.id } });
    const followingCount = await prisma.userLike.count({ where: { likedById: found.id } });

    return res.status(200).json({ success: true, followersCount, followingCount });
  } catch (err: any) {
    console.error("[followCounts] error:", err?.message ?? err);
    return res.status(500).json({ success: false, message: "Error interno", detail: String(err?.message ?? err) });
  }
}
