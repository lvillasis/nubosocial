// pages/api/posts/trending/route.ts
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma"; // si tu export es named: "import { prisma } from '@/lib/prisma'"

const contentHashtagRegex = /#(\w+)/g;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const posts = await prisma.post.findMany({
      select: { hashtags: true, content: true },
    });

    const counter: Record<string, number> = {};

    for (const p of posts) {
      if (Array.isArray(p.hashtags) && p.hashtags.length > 0) {
        for (const raw of p.hashtags) {
          const tag = String(raw).replace(/^#/, "").trim().toLowerCase();
          if (!tag) continue;
          counter[tag] = (counter[tag] || 0) + 1;
        }
        continue;
      }

      if (typeof p.content === "string") {
        const matches = p.content.matchAll(contentHashtagRegex);
        for (const m of matches) {
          const tag = String(m[1]).trim().toLowerCase();
          if (!tag) continue;
          counter[tag] = (counter[tag] || 0) + 1;
        }
      }
    }

    const trends = Object.entries(counter)
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cache-Control igual que tu versión App Router
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(trends);
  } catch (err) {
    console.error("Error trending (pages API):", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
