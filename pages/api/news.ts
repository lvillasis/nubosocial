// pages/api/news.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: "Falta la clave de API para noticias" });
  }

  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error desconocido en NewsAPI");
    }

    res.status(200).json(data.articles);
  } catch (error) {
    console.error("Error en /api/news:", error);
    res.status(500).json({ message: "Error al obtener noticias" });
  }
}