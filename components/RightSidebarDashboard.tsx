// components/RightSidebarDashboard.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

type Trend = { hashtag: string; count: number; daily?: { day: string; value: number }[] };
type PreviewPost = {
  id: string;
  content: string;
  image?: string | null;
  author?: { username?: string; name?: string | null; image?: string | null };
  createdAt?: string;
};

export default function RightSidebarDashboard() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- caches: ahora permiten `undefined` (pending), `null` (no data) o valor real
  const [previewCache, setPreviewCache] = useState<Record<string, PreviewPost | null | undefined>>({});
  const [authorsCache, setAuthorsCache] = useState<
    Record<string, { name?: string | null; image?: string | null; username?: string }[] | null | undefined>
  >({});
  const [dailyCache, setDailyCache] = useState<Record<string, Trend["daily"] | null | undefined>>({});

  const hoverTimer = useRef<number | null>(null);
  const hoveredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/posts/trendingAll");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!mounted) return;
        const arr: Trend[] = Array.isArray(json)
          ? json.map((i: any) =>
              typeof i === "string"
                ? { hashtag: String(i).replace(/^#/, ""), count: 1 }
                : {
                    hashtag: String(i.hashtag || i.tag || i.name || "").replace(/^#/, ""),
                    count: Number(i.count ?? 0),
                    daily: i.daily ?? undefined,
                  }
            )
          : [];
        setTrends(arr);
      } catch (err: any) {
        console.error("Error loading trends (RightSidebarDashboard):", err);
        if (mounted) setError(String(err?.message ?? "Error"));
        setTrends([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const top5 = useMemo(() => (trends ? trends.slice(0, 5) : []), [trends]);
  const chartData = top5.map((t) => ({ name: `#${t.hashtag}`, value: t.count }));

  // fetch preview + authors + daily data para un hashtag (caché)
  const fetchPreviewAndAuthors = async (rawTag: string) => {
    const key = rawTag.replace(/^#/, "").toLowerCase();

    // si ya está en cache (incluso null) y daily/authors están cacheados, no volver a fetch
    if (previewCache[key] !== undefined && authorsCache[key] !== undefined && dailyCache[key] !== undefined) return;

    // marcar como pending (undefined)
    setPreviewCache((s) => ({ ...s, [key]: undefined }));
    setAuthorsCache((s) => ({ ...s, [key]: undefined }));
    setDailyCache((s) => ({ ...s, [key]: undefined }));

    try {
      const res = await fetch(`/api/posts/byHashtag?tag=${encodeURIComponent(key)}&limit=12`);
      if (!res.ok) {
        setPreviewCache((s) => ({ ...s, [key]: null }));
        setAuthorsCache((s) => ({ ...s, [key]: null }));
        setDailyCache((s) => ({ ...s, [key]: null }));
        return;
      }
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json.posts ?? [];

      const first = arr.length > 0 ? arr[0] : null;
      const preview: PreviewPost | null = first
        ? {
            id: first.id,
            content: first.content ?? "",
            image: first.image ?? null,
            author: first.author ?? first.user ?? undefined,
            createdAt: first.createdAt ?? first.created_at ?? undefined,
          }
        : null;

      // autores únicos
      const authorsMap = new Map<string, { name?: string | null; image?: string | null; username?: string }>();
      arr.forEach((p: any) => {
        const a = p.author ?? p.user ?? null;
        if (a) {
          const keyA = String(a.id ?? a.username ?? a.name ?? "");
          if (!authorsMap.has(keyA)) {
            authorsMap.set(keyA, { name: a.name ?? a.username ?? keyA, image: a.image ?? null, username: a.username });
          }
        }
      });
      const authors = Array.from(authorsMap.values()).slice(0, 6);

      // agrupamos por fecha YYYY-MM-DD de forma segura
      const countsByDay = (arr as any[]).reduce<Record<string, number>>((acc, p) => {
        const dRaw = p.createdAt ?? p.created_at ?? null;
        if (!dRaw) return acc;
        const d = new Date(dRaw);
        if (Number.isNaN(d.getTime())) return acc;
        const day = d.toISOString().slice(0, 10);
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {});

      const daily = Object.keys(countsByDay)
        .sort()
        .map((day) => ({ day, value: countsByDay[day] }));

      setPreviewCache((s) => ({ ...s, [key]: preview }));
      setAuthorsCache((s) => ({ ...s, [key]: authors }));
      setDailyCache((s) => ({ ...s, [key]: daily.length ? daily : null }));
    } catch (_err) {
      console.error("fetchPreviewAndAuthors error:", err);
      setPreviewCache((s) => ({ ...s, [key]: null }));
      setAuthorsCache((s) => ({ ...s, [key]: null }));
      setDailyCache((s) => ({ ...s, [key]: null }));
    }
  };

  // hover handlers con debounce corto
  const handleMouseEnter = (rawTag: string) => {
    const key = rawTag.replace(/^#/, "").toLowerCase();
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      hoveredKeyRef.current = key;
      fetchPreviewAndAuthors(rawTag);
    }, 180);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    hoveredKeyRef.current = null;
  };

  const getSparkData = (trend: Trend) => {
    const key = trend.hashtag.replace(/^#/, "").toLowerCase();
    const source = trend.daily ?? dailyCache[key] ?? [{ day: "hoy", value: trend.count }];
    return source.map((d: any) => ({ name: (d.day && d.day.slice ? d.day.slice(5) : d.day) ?? "", value: d.value }));
  };

  return (
    <aside className="w-80">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl bg-white/60 dark:bg-gradient-to-b dark:from-[#0b0714] dark:to-[#07101a] border border-gray-200 dark:border-gray-800 p-4 shadow-lg transition-colors">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-400">🔥 Tendencias</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Top 5 del momento</p>
            </div>
            <Link href="/trending" className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer">Ver todas</Link>
          </div>

          <div className="mt-3 h-28">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-500">Cargando...</div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-red-400">{error}</div>
            ) : top5.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, left: -10, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={undefined} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip wrapperStyle={{ background: "#0b1016", border: "1px solid rgba(148,163,184,0.08)", color: "#e6edf3" }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
              </div>
            ) : (
              <ul className="space-y-2">
                {top5.map((t, i) => {
                  const key = t.hashtag.replace(/^#/, "").toLowerCase();
                  const preview = previewCache[key];
                  const authors = authorsCache[key];
                  const daily = t.daily ?? dailyCache[key] ?? null;

                  return (
                    <li
                      key={t.hashtag}
                      onMouseEnter={() => handleMouseEnter(t.hashtag)}
                      onMouseLeave={handleMouseLeave}
                      className="relative flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-100/60 dark:hover:bg-[rgba(255,255,255,0.02)] transition cursor-pointer"
                    >
                      <Link href={`/hashtag/${encodeURIComponent(t.hashtag)}`} className="flex items-center gap-3 min-w-0 truncate">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-600 text-xs font-semibold text-white">#{i + 1}</span>
                        <div className="truncate">
                          <div className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">#{t.hashtag}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t.count} publicaciones</div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2">
                        <div className="w-24 h-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getSparkData(t)}>
                              <defs>
                                <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill={`url(#g-${key})`} strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`#${t.hashtag}`);
                            } catch (_) {}
                          }}
                          title="Copiar hashtag"
                          className="ml-2 text-xs px-2 py-1 rounded-md border text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[rgba(255,255,255,0.04)] hover:bg-gray-100/60 dark:hover:bg-[rgba(255,255,255,0.03)] transition cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>

                      {hoveredKeyRef.current === key && preview !== undefined && preview !== null && (
                        <div className="absolute z-40 w-[360px] -right-[370px] top-0 transform-gpu transition-all duration-150" role="dialog" aria-label={`Vista previa de #${t.hashtag}`}>
                          <div className="rounded-lg border p-3 shadow-2xl bg-white dark:bg-gradient-to-b dark:from-[#0e0a14] dark:to-[#071018] border-gray-200 dark:border-[rgba(255,255,255,0.04)] text-gray-800 dark:text-gray-100">
                            <div className="flex items-start gap-3">
                              <img src={preview.author?.image ?? "/default-avatar.png"} alt={preview.author?.name ?? preview.author?.username} className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="truncate">
                                    <div className="font-semibold truncate">{preview.author?.name ?? preview.author?.username}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">@{preview.author?.username}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{preview.createdAt ? new Date(preview.createdAt).toLocaleString() : ""}</div>
                                </div>

                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 line-clamp-3 break-words">{preview.content}</p>

                                {authors && authors.length > 0 && (
                                  <div className="mt-3 flex items-center gap-2">
                                    {authors.slice(0, 5).map((a, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <img src={a.image ?? "/default-avatar.png"} alt={a.name ?? a.username} className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                      </div>
                                    ))}
                                    <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">+{Math.max(0, (authors.length || 0) - 5)} más</div>
                                  </div>
                                )}

                                {(t.daily ?? dailyCache[key]) && (
                                  <div className="mt-3 w-full h-14">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={getSparkData({ ...t, daily: t.daily ?? dailyCache[key] ?? undefined })}>
                                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="rgba(139,92,246,0.14)" strokeWidth={2} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                            </div>

                            {preview.image && (
                              <div className="mt-3 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img src={preview.image} alt="preview image" className="w-full h-28 object-cover" />
                              </div>
                            )}

                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                              <Link href={`/hashtag/${encodeURIComponent(t.hashtag.replace(/^#/, ""))}`} className="text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer">
                                Ver todas →
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-gray-500">Preview</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 dark:bg-gradient-to-b dark:from-[#0b0714] dark:to-[#07101a] border border-gray-200 dark:border-gray-800 p-4 shadow-lg transition-colors">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ideas rápidas</h5>
          <ul className="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <li>📈 Mostrar evolución por día (más detallado en la página)</li>
            <li>🔍 Previews al pasar el cursor (hover)</li>
            <li>👥 Usuarios que hablan de estas tendencias</li>
          </ul>
          <div className="mt-3">
            <Link href="/trending" className="inline-block text-sm px-3 py-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white cursor-pointer">
              Explorar tendencias
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
