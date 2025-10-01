// components/RightSidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Newspaper, Megaphone, Calendar, TrendingUp, ChevronRight, Sun, Moon } from "lucide-react";
import SearchBar from "@/pages/components/SearchBar"; // ajusta si tu SearchBar está en otro path

type Trend = { hashtag: string; count: number };
type PreviewPost = {
  id: string;
  content: string;
  image?: string | null;
  author?: { username?: string; name?: string | null; image?: string | null };
  createdAt?: string;
};

export default function RightSidebar({ t, activeTag }: { t?: (s: string) => string; activeTag?: string }) {
  const translate = t ?? ((s: string) => s);

  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [previewCache, setPreviewCache] = useState<Record<string, PreviewPost | null>>({});
  const [hoverTag, setHoverTag] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fallbackHashtags = ["#OpenAI", "#TechNews", "#ReactJS", "#Devs", "#Startups", "#NextJS", "#IA"];

  // Theme toggle state: true = dark, false = light, null = not initialized
  const [isDark, setIsDark] = useState<boolean | null>(null);

  // Inicializar theme (localStorage o prefers-color-scheme)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme"); // "dark" | "light"
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
      return;
    }
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  // Toggle handler
  const toggleTheme = () => {
    if (typeof window === "undefined") return;
    const nowDark = !(isDark === true);
    setIsDark(nowDark);
    if (nowDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("theme");
      if (saved) return;
      if (e.matches) {
        document.documentElement.classList.add("dark");
        setIsDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        setIsDark(false);
      }
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq?.addEventListener) {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    } else if (mq?.addListener) {
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res =
          (await fetch("/api/posts/trendingAll").catch(() => null)) ||
          (await fetch("/api/posts/trending").catch(() => null));
        if (!res || !res.ok) throw new Error("no trends");
        const json = await res.json();
        if (!mounted) return;
        const parsed: Trend[] =
          Array.isArray(json) && json.length
            ? json
                .map((i: any) =>
                  typeof i === "string"
                    ? { hashtag: String(i).replace(/^#/, ""), count: 1 }
                    : { hashtag: String(i.hashtag || i.tag || i.name || "").replace(/^#/, ""), count: Number(i.count || 1) }
                )
                .filter((x) => x.hashtag)
            : [];
        setTrends(parsed.length ? parsed : fallbackHashtags.map((h, i) => ({ hashtag: h.replace("#", ""), count: i === 0 ? 3 : 1 })));
      } catch (err) {
        setTrends(fallbackHashtags.map((h, i) => ({ hashtag: h.replace("#", ""), count: i === 0 ? 3 : 1 })));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchPreview = async (tag: string) => {
    const key = tag.replace(/^#/, "").toLowerCase();
    if (previewCache[key] !== undefined) return;
    try {
      const res = await fetch(`/api/posts/byHashtag?tag=${encodeURIComponent(key)}&limit=1`);
      if (!res.ok) {
        setPreviewCache((c) => ({ ...c, [key]: null }));
        return;
      }
      const json = await res.json();
      const item = Array.isArray(json) && json.length > 0 ? json[0] : null;
      if (!item) {
        setPreviewCache((c) => ({ ...c, [key]: null }));
        return;
      }
      const preview: PreviewPost = {
        id: item.id,
        content: item.content ?? "",
        image: item.image ?? null,
        author: item.author ?? item.user ?? item.userInfo ?? undefined,
        createdAt: item.createdAt ?? item.created_at ?? undefined,
      };
      setPreviewCache((c) => ({ ...c, [key]: preview }));
    } catch (err) {
      setPreviewCache((c) => ({ ...c, [key]: null }));
    }
  };

  const handleMouseEnter = (rawTag: string) => {
    const key = rawTag.replace(/^#/, "").toLowerCase();
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHoverTag(key);
      fetchPreview(key);
    }, 220);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHoverTag(null);
  };

  const isActive = (tag?: string) => !!(tag && activeTag && tag.toLowerCase() === activeTag.replace(/^#/, "").toLowerCase());

  return (
    <aside className="hidden lg:block w-80">
      {/* Container adaptado para light/dark */}
      <div
        ref={containerRef}
        className="rounded-2xl p-5 border transition-colors
                   bg-white/60 dark:bg-gradient-to-b dark:from-[#071018] dark:to-[#07121a]
                   border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-xl text-slate-900 dark:text-gray-200 sticky top-6"
      >
        {/* Header row: Search + Theme Toggle */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="rounded-xl border p-2 transition-colors
                            bg-gray-100/60 dark:bg-[rgba(255,255,255,0.02)]
                            border-gray-200 dark:border-[rgba(255,255,255,0.04)]">
              <SearchBar />
            </div>
          </div>

          {/* Theme toggle */}
          <div className="ml-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Cambiar tema"
              className="flex items-center justify-center w-10 h-10 rounded-full border transition-colors
                         border-gray-200 bg-white/60 dark:border-gray-700 dark:bg-[rgba(255,255,255,0.02)]
                         hover:scale-[1.03] active:scale-95 focus:outline-none"
            >
              {/* Mantengo la lógica isDark como en tu versión */}
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* News */}
        <section className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{translate("Noticias")}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Actualizaciones y tips</p>
            </div>
          </div>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="mt-0.5">
                <Megaphone className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <div className="font-medium text-sm">Nueva actualización</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Mejoras en rendimiento y búsqueda</div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="mt-0.5">
                <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8H9L12 2Z" stroke="currentColor" strokeWidth="1.2"/></svg>
              </div>
              <div>
                <div className="font-medium text-sm">Usuarios destacados</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Sigue perfiles relevantes</div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <div className="mt-0.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="font-medium text-sm">Eventos</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Charlas y meetups esta semana</div>
              </div>
            </li>
          </ul>
        </section>

        {/* Trends */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-400 to-yellow-400 shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{translate("Tendencias")}</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Top actual</div>
              </div>
            </div>
            <Link href="/trending" className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1">
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-xl border p-2 bg-transparent max-h-[44vh] overflow-auto relative
                         border-gray-200 dark:border-[rgba(255,255,255,0.04)]
                         scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {loading && (
              <div className="space-y-2 animate-pulse p-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            )}

            {!loading && trends && trends.length > 0 && (
              <ul className="space-y-2 p-2">
                {trends.slice(0, 15).map((t, idx) => {
                  const tagKey = t.hashtag.replace(/^#/, "").toLowerCase();
                  const active = isActive(t.hashtag);
                  const preview = previewCache[tagKey];
                  const showPreview = hoverTag === tagKey && preview !== undefined && preview !== null;

                  return (
                    <li
                      key={t.hashtag}
                      onMouseEnter={() => handleMouseEnter(t.hashtag)}
                      onMouseLeave={handleMouseLeave}
                      className={`relative flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition
                        ${active ? "bg-gradient-to-r from-purple-100/40 dark:from-purple-700/20 to-indigo-100/10 dark:to-indigo-700/10 ring-1 ring-purple-600" : "hover:bg-gray-100/60 dark:hover:bg-[rgba(255,255,255,0.02)]"}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#071018] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-semibold text-gray-800 dark:text-gray-300 cursor-default">
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <Link
                            href={`/hashtag/${encodeURIComponent(t.hashtag.replace(/^#/, ""))}`}
                            className={`font-semibold block truncate ${active ? "text-purple-700 dark:text-purple-300" : "text-gray-800 dark:text-gray-100"}`}
                          >
                            #{t.hashtag}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.count} publicaciones</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(`#${t.hashtag}`);
                            } catch (_) {}
                          }}
                          title="Copiar hashtag"
                          className="text-xs px-2 py-1 rounded-md border transition
                                     border-gray-200 dark:border-[rgba(255,255,255,0.04)]
                                     text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                        >
                          Copiar
                        </button>
                        <Link
                          href={`/hashtag/${encodeURIComponent(t.hashtag.replace(/^#/, ""))}`}
                          className="text-xs px-2 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm cursor-pointer"
                        >
                          Abrir
                        </Link>
                      </div>

                      {/* preview */}
                      {showPreview && preview && (
                        <div
                          className="absolute z-40 w-[360px] -right-[370px] top-0 transform-gpu transition-all duration-200"
                          role="dialog"
                          aria-label={`Vista previa de #${t.hashtag}`}
                        >
                          <div className="rounded-lg border p-3 shadow-2xl
                                          bg-white dark:bg-gradient-to-b dark:from-[#0e0a14] dark:to-[#071018]
                                          border-gray-200 dark:border-[rgba(255,255,255,0.04)] text-gray-800 dark:text-gray-100">
                            <div className="flex items-start gap-3">
                              <img
                                src={preview.author?.image ?? "/default-avatar.png"}
                                alt={preview.author?.name ?? preview.author?.username}
                                className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="truncate">
                                    <div className="font-semibold truncate">{preview.author?.name ?? preview.author?.username}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">@{preview.author?.username}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{preview.createdAt ? new Date(preview.createdAt).toLocaleString() : ""}</div>
                                </div>

                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 line-clamp-3 break-words">{preview.content}</p>
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

            {!loading && (!trends || trends.length === 0) && (
              <ul className="space-y-2 text-sm p-3">
                {fallbackHashtags.map((h) => (
                  <li key={h}>
                    <Link href={`/hashtag/${encodeURIComponent(h.replace("#", ""))}`} className="hover:underline text-gray-700 dark:text-gray-200 cursor-pointer">
                      {h}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Link href="/trending" className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-2 cursor-pointer">
              Ver más tendencias <ChevronRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">Actualizado</span>
          </div>
        </section>
      </div>
    </aside>
  );
}
