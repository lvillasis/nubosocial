// pages/api/posts/trendingAll.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { checkRateLimitTrending } from "@/lib/rateLimit";

const contentHashtagRegex = /#([^\s#.,!?;:()[\]{}"“”'`<>]+)/g;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // rate-limit by IP (trending has high limit, and is cacheable)
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anon";
    const rl = await checkRateLimitTrending(String(ip));
    if (!rl.success) {
      const now = Date.now();
      const retryAfterSec = rl.reset ? Math.max(1, Math.ceil((Number(rl.reset) - now) / 1000)) : 60;
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: "Too many requests" });
    }

    const posts = await prisma.post.findMany({ select: { hashtags: true, content: true } });

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
      .sort((a, b) => b.count - a.count); // todos ordenados por popularidad

    // Cache control: CDN cache 60s, allow stale while revalidate
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(trends);
  } catch (_err) {
    console.error("Error /api/posts/trendingAll:", _err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
