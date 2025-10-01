// pages/api/user/followCounts.ts
// Shim / compat layer para que /api/user/followCounts funcione
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "./followersCount"; // ajusta si tu archivo real tiene otro nombre exacto

console.log("[shim] /api/user/followCounts loaded");

export default async function shimHandler(req: NextApiRequest, res: NextApiResponse) {
  // opcional: puedes añadir lógica extra aquí antes o después
  return handler(req, res);
}
