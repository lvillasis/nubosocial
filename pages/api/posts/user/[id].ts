import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== "GET") return res.status(405).end(`Method ${req.method} Not Allowed`);

  try {
    const posts = await prisma.post.findMany({
      where: { authorId: String(id) },
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
        comments: {
          include: { author: { select: { id: true, name: true, username: true, image: true } } },
        },
        likes: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10, // los 10 más recientes, puedes agregar paginación
    });

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ error: "Error fetching user posts" });
  }
}
