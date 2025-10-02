// pages/api/user/followers/trends.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/followers/trends?userId=... | username=...&days=30&granularity=day
 *
 * Respuesta:
 * {
 *  labels: string[] (ISO datetimes de cada intervalo),
 *  follows: number[],
 *  unfollows: number[],
 *  net: number[]
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // permitimos userId o username
    const qUserId = typeof req.query.userId === "string" ? req.query.userId : "";
    const qUsername = typeof req.query.username === "string" ? req.query.username : "";

    let userId = qUserId;
    if (!userId && qUsername) {
      const u = await prisma.user.findUnique({ where: { username: qUsername }, select: { id: true } });
      if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
      userId = u.id;
    }

    if (!userId) return res.status(400).json({ error: "userId o username requerido" });

    // validaciones
    const days = Math.max(1, Math.min(365, Number(req.query.days ?? 30)));
    const granularity = String(req.query.granularity ?? "day") === "hour" ? "hour" : "day";
    const trunc = granularity === "hour" ? "hour" : "day";

    // rango
    const now = new Date();
    const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000); // incluye día actual

    // SQL seguro: date_trunc inyectado como literal (ya validado), tabla también inyectada controlada
    const tableName = Prisma.raw(`"FollowEvent"`);

    const rows = (await prisma.$queryRaw(
      Prisma.sql`
        SELECT date_trunc(${Prisma.raw("'" + trunc + "'")}, "createdAt") AS period,
               "type",
               COUNT(*)::int AS count
        FROM ${tableName}
        WHERE "userId" = ${userId} AND "createdAt" >= ${start}
        GROUP BY period, "type"
        ORDER BY period ASC
      `
    )) as Array<{ period: Date | string; type: string; count: number }>;

    // map periodISO -> { follow, unfollow }
    const map = new Map<string, { follow: number; unfollow: number }>();
    for (const r of rows) {
      // r.period puede venir como Date o string dependiendo de Prisma/driver
      const periodDate = r.period instanceof Date ? r.period : new Date(String(r.period));
      const iso = periodDate.toISOString();
      const cur = map.get(iso) ?? { follow: 0, unfollow: 0 };
      if (r.type === "follow") cur.follow += Number(r.count ?? 0);
      else if (r.type === "unfollow") cur.unfollow += Number(r.count ?? 0);
      map.set(iso, cur);
    }

    // generar arrays completos (cada intervalo desde start -> now)
    const labels: string[] = [];
    const follows: number[] = [];
    const unfollows: number[] = [];
    const net: number[] = [];

    const stepMs = trunc === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const normalize = (d: Date) => {
      const nd = new Date(d);
      if (trunc === "hour") {
        nd.setUTCMinutes(0, 0, 0);
      } else {
        nd.setUTCHours(0, 0, 0, 0);
      }
      return nd;
    };

    let cursor = normalize(start);
    // recorremos hasta el día/hora actual incluido
    while (cursor.getTime() <= now.getTime()) {
      const key = cursor.toISOString();
      labels.push(key);
      const counts = map.get(key) ?? { follow: 0, unfollow: 0 };
      follows.push(counts.follow);
      unfollows.push(counts.unfollow);
      net.push(counts.follow - counts.unfollow);
      cursor = new Date(cursor.getTime() + stepMs);
    }

    return res.status(200).json({ labels, follows, unfollows, net });
  } catch (_err) {
    console.error("followers/trends error:", _err);
    return res.status(500).json({ error: "Error interno" });
  }
}
