// pages/trending.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RightSidebarDashboard from "@/components/RightSidebarDashboard";

type Trend = { hashtag: string; count: number };

export default function TrendingPage() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshPulse, setRefreshPulse] = useState(false);
  const perPage = 20;

  const fetchTrends = async () => {
    setRefreshPulse(true);
    setLoading(true);
    try {
      const res = await fetch("/api/posts/trendingAll");
      if (!res.ok) throw new Error("No trends");
      const json = await res.json();
      setTrends(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Error loading trends:", err);
      setTrends([]);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshPulse(false), 550);
    }
  };

  useEffect(() => {
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!trends) return [];
    const s = q.trim().toLowerCase();
    return trends
      .slice()
      .sort((a, b) => b.count - a.count)
      .filter((t) => (s ? t.hashtag.toLowerCase().includes(s) : true));
  }, [trends, q]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => setPage(1), [q]);

  return (
    <div className="min-h-screen font-sans bg-neutral-50 dark:bg-[#0d1117] text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto py-10 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500">
            Tendencias
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Listado completo de hashtags ordenado por popularidad</p>
        </header>

        <div className="mb-6 flex flex-col md:flex-row md:items-center md:gap-4 gap-3">
          <div className="flex-1">
            {/* input con icono */}
            <div className="relative rounded-full border transition-colors border-gray-200 dark:border-gray-800 p-1 bg-white dark:bg-gradient-to-b dark:from-[#071018] dark:to-[#07121a] shadow-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar hashtag..."
                className="w-full rounded-full px-4 py-3 pl-10 bg-transparent text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                aria-label="Buscar hashtag"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs rounded-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow select-none">
              Orden: popular
            </div>

            <button
              onClick={fetchTrends}
              disabled={loading}
              aria-label="Actualizar tendencias"
              className={`hidden sm:inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border transition
                ${loading ? "opacity-70 cursor-wait" : "hover:border-purple-400 cursor-pointer"}
                ${refreshPulse ? "animate-pulse" : ""} border-gray-200 dark:border-gray-700 bg-white dark:bg-[rgba(255,255,255,0.03)]`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 text-current transform transition-transform duration-300"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6" />
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 20v-6h-6" />
                  </svg>
                  <span>Actualizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left list */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border transition-colors border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gradient-to-b dark:from-[#071017] dark:to-[#07121a] shadow-lg">
              {loading && (
                <div className="space-y-3 text-gray-600 dark:text-gray-400">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              )}

              {!loading && visible.length === 0 && (
                <div className="text-gray-600 dark:text-gray-400 py-6 text-center">No se encontraron hashtags.</div>
              )}

              {!loading && visible.length > 0 && (
                <ul className="space-y-3">
                  {visible.map((t, i) => {
                    const index = (page - 1) * perPage + i + 1;
                    return (
                      <li
                        key={t.hashtag}
                        className="group flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors border-gray-200 dark:border-gray-800 bg-white/0 dark:bg-[linear-gradient(180deg,#071018,transparent)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-transform duration-200 relative overflow-hidden"
                        role="article"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#0f0b14] to-[#0b1016] border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                            #{index}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400">#{index} · Tendencia</div>
                              <Link
                                href={`/hashtag/${encodeURIComponent(t.hashtag)}`}
                                className="ml-1 font-semibold text-gray-900 dark:text-white truncate hover:underline cursor-pointer"
                              >
                                #{t.hashtag}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">Basado en publicaciones recientes</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300">
                            {t.count}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">publicaciones</div>
                        </div>

                        {/* decorative glow on hover */}
                        <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 rounded-lg ring-1 ring-purple-700/10" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!loading && total > perPage && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} de {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-[rgba(255,255,255,0.02)] hover:border-purple-500 disabled:opacity-50 transition cursor-pointer"
                    >
                      Anterior
                    </button>
                    <button
                      disabled={page === pages}
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-pink-500 text-white disabled:opacity-50 transition cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column - dashboard sidebar */}
          <aside>
            <RightSidebarDashboard />
          </aside>
        </div>
      </div>
    </div>
  );
}
