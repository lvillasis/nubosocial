// pages/api/me.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function handler(req: any, res: any) { 
  const session = await getServerSession(req, res, authOptions);
  res.status(200).json({ session });
}