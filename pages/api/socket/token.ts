// pages/api/socket/token.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(401).json({ error: "User not found" });

  const secret = process.env.JWT_SECRET || "dev-secret";
  const payload = { sub: user.id, email: user.email };
  const token = jwt.sign(payload, secret, { expiresIn: "1h" });

  return res.status(200).json({ token });
}
