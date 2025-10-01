// pages/api/tweets.ts
import type { NextApiRequest, NextApiResponse } from "next";

const mockTweets = [
  {
    id: "1",
    user: {
      name: "Juan Pérez",
      username: "juanp",
      avatar: "https://i.pravatar.cc/100?img=3",
    },
    content: "¡Hola mundo! Este es mi primer tweet 🚀",
    createdAt: "2025-07-01T10:00:00Z",
  },
  {
    id: "2",
    user: {
      name: "Ana Gómez",
      username: "anag",
      avatar: "https://i.pravatar.cc/100?img=4",
    },
    content: "Next.js + Tailwind = ❤️",
    createdAt: "2025-07-01T11:30:00Z",
  },
  {
    id: "3",
    user: {
      name: "Dev Bot",
      username: "devbot",
      avatar: "https://i.pravatar.cc/100?img=5",
    },
    content: "¿Sabías que puedes usar `useEffect` para hacer fetch de datos en React? 😉",
    createdAt: "2025-07-01T12:00:00Z",
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(mockTweets);
}