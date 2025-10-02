// app/api/posts/trending/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- si exportas default: import prisma from "@/lib/prisma";

const contentHashtagRegex = /#(\w+)/g;

export async function GET() {
  try {
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cache: s-maxage para CDN, stale-while-revalidate para revalidación
    return NextResponse.json(trends, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (_err) {
    console.error("Error trending (route.ts):", _err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
