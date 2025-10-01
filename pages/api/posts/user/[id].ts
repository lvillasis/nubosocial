// pages/api/posts/user/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        authorId: String(id),
      },
      include: {
        author: {
          select: {
            name: true,
            image: true,
            id: true,
          },
        },
        comments: {
          include: {
            author: {
              select: { name: true },
            },
          },
        },
        likes: {
          select: { userId: true }, // 👈 relación correcta
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Error fetching user posts" });
  }
}
