// pages/api/posts/trending.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

type Trend = { hashtag: string; count: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // obtener hashtags (o contenido como fallback)
    const posts = await prisma.post.findMany({
      select: { hashtags: true, content: true },
    });

    const counter: Record<string, number> = {};
    const contentHashtagRegex = /#(\w+)/g;

    for (const p of posts) {
      // 1) si existe el array hashtags en la fila, úsalo
      if (Array.isArray(p.hashtags) && p.hashtags.length > 0) {
        for (const raw of p.hashtags) {
          const tag = String(raw).replace(/^#/, "").trim().toLowerCase();
          if (!tag) continue;
          counter[tag] = (counter[tag] || 0) + 1;
        }
        continue;
      }

      // 2) fallback: extraer de content con regex
      if (typeof p.content === "string") {
        const matches = p.content.matchAll(contentHashtagRegex);
        for (const m of matches) {
          const tag = String(m[1]).trim().toLowerCase();
          if (!tag) continue;
          counter[tag] = (counter[tag] || 0) + 1;
        }
      }
    }

    const trends: Trend[] = Object.entries(counter)
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10

    return res.status(200).json(trends);
  } catch (error) {
    console.error("Error al obtener tendencias:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
