// components/TrendingSidebar.tsx
"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";

type Trend = { hashtag: string; count: number };

export default function TrendingSidebar({ trends = [] as Trend[] }) {
  return (
    <aside className="w-full lg:w-72">
      <div className="bg-[#0b1114] rounded-2xl shadow-md p-4 text-white border border-gray-800 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-md">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-lg">Tendencias</h2>
          </div>
          <span className="text-xs text-gray-400">Basado en publicaciones</span>
        </div>

        {trends.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No hay tendencias aún</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {trends.map((t, i) => (
              <li key={t.hashtag} className="group">
                <Link
                  href={`/hashtag/${encodeURIComponent(t.hashtag.replace(/^#/, ""))}`}
                  className="block p-3 rounded-xl transition-transform transform group-hover:translate-x-1 group-hover:shadow-lg bg-transparent hover:bg-gray-900/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-gray-700">
                        <span className="text-sm font-semibold text-white">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Tendencia</p>
                        <p className="font-medium text-white break-words">#{t.hashtag}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-sm font-semibold">{t.count}</span>
                        <span className="text-xs text-gray-400">publicaciones</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <p>Actualizado en tiempo real</p>
        </div>
      </div>
    </aside>
  );
}
