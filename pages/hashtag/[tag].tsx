// pages/hashtag/[tag].tsx
import React, { useCallback, useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import RightSidebar from "@/components/RightSidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

type Author = { id: string; username: string; name?: string | null; image?: string | null };
type PostItem = {
  id: string;
  content: string;
  createdAt: string;
  image?: string | null;
  author: Author;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
};

type CommentType = {
  id: string;
  content: string;
  createdAt: string;
  author: { username: string; name?: string | null; image?: string | null };
};

function extractHashtagsFromText(text?: string): string[] {
  if (!text) return [];
  const regex = /#([^\s#.,!?;:()[\]{}"“”'`<>]+)/g;
  const set = new Set<string>();
  let m;
   
  while ((m = regex.exec(text)) !== null) {
    const tag = String(m[1] || "").replace(/^#/, "").trim();
    if (tag) set.add(tag);
  }
  return Array.from(set);
}

function timeAgo(isoDate: string) {
  const d = new Date(isoDate);
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString();
}

export default function HashtagPage({
  tag,
  posts,
  likedPostIds,
  initialFollowing,
}: {
  tag: string;
  posts: PostItem[];
  likedPostIds: string[];
  initialFollowing: boolean;
}) {
  const [postsState, setPostsState] = useState<PostItem[]>(posts || []);
  const [loadingLike, setLoadingLike] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    (likedPostIds || []).forEach((id) => (m[id] = true));
    return m;
  });
  const [animateLike, setAnimateLike] = useState<Record<string, boolean>>({});
  const [activeCommentsPost, setActiveCommentsPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommentType[] | null>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- follow tag ---
  const [following, setFollowing] = useState<boolean>(!!initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  const toggleFollow = useCallback(async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev); // optimistic

    try {
      const res = await fetch("/api/hashtag/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
        credentials: "include",
      });

      if (res.status === 401) {
        setErrorMsg("Inicia sesión para seguir hashtags.");
        setFollowing(prev);
        setFollowLoading(false);
        return;
      }

      if (!res.ok) {
        const txt = (await res.text().catch(() => "")) || "Error al cambiar seguimiento";
        setErrorMsg(txt);
        setFollowing(prev);
        setFollowLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (typeof data.following === "boolean") {
        setFollowing(!!data.following);
      }
    } catch (_err) {
      console.error("toggleFollow error:", _err);
      setErrorMsg("Error de red al seguir/desseguir");
      setFollowing(prev);
    } finally {
      setFollowLoading(false);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  }, [followLoading, following, tag]);

  // --- LIKE: toggle usando /api/posts/[id]/like (incluye credenciales) ---
  const toggleLike = useCallback(
    async (postId: string) => {
      if (loadingLike[postId]) return;
      setLoadingLike((s) => ({ ...s, [postId]: true }));

      const currentlyLiked = !!likedMap[postId];
      const prevCount = postsState.find((p) => p.id === postId)?.likesCount ?? 0;
      const willLike = !currentlyLiked;

      // optimistic UI
      setLikedMap((s) => ({ ...s, [postId]: willLike }));
      setAnimateLike((s) => ({ ...s, [postId]: true }));
      setTimeout(() => setAnimateLike((s) => ({ ...s, [postId]: false })), 500);

      setPostsState((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const delta = willLike ? 1 : -1;
          return { ...p, likesCount: Math.max(0, p.likesCount + delta) };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (res.status === 401) {
          setErrorMsg("Inicia sesión para dar like.");
          setLikedMap((s) => ({ ...s, [postId]: currentlyLiked }));
          setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, likesCount: prevCount } : p)));
          return;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "Error al procesar like");
          setErrorMsg(txt || "Error al procesar like");
          setLikedMap((s) => ({ ...s, [postId]: currentlyLiked }));
          setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, likesCount: prevCount } : p)));
          return;
        }

        const data = await res.json().catch(() => ({})); // { liked: boolean, likesCount?: number }
        if (typeof data.likesCount === "number") {
          setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, likesCount: Math.max(0, Math.floor(data.likesCount)) } : p)));
        }
        if (typeof data.liked === "boolean") {
          setLikedMap((s) => ({ ...s, [postId]: !!data.liked }));
        }
      } catch (_err) {
        console.error("Error al dar like:", _err);
        setErrorMsg("Error de red al dar like");
        setLikedMap((s) => ({ ...s, [postId]: currentlyLiked }));
        setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, likesCount: prevCount } : p)));
      } finally {
        setLoadingLike((s) => ({ ...s, [postId]: false }));
        setTimeout(() => setErrorMsg(null), 3000);
      }
    },
    [loadingLike, likedMap, postsState]
  );

  // --- COMMENTS: load & submit (POST include credentials) ---
  const loadComments = useCallback(
    async (postId: string) => {
      if (postId in comments) return;
      setCommentsLoading((s) => ({ ...s, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comment`);
        if (res.status === 404 || res.status === 405) {
          setComments((c) => ({ ...c, [postId]: null }));
          return;
        }
        if (!res.ok) {
          setComments((c) => ({ ...c, [postId]: null }));
          const txt = await res.text().catch(() => "No se pudieron cargar comentarios");
          setErrorMsg(txt || "No se pudieron cargar los comentarios");
          return;
        }

        const data = await res.json();
        const list: CommentType[] = Array.isArray(data) ? data : Array.isArray(data.comments) ? data.comments : [];
        setComments((c) => ({ ...c, [postId]: list }));
      } catch (_err) {
        console.error("Error cargando comentarios:", _err);
        setErrorMsg("Error de red al cargar comentarios");
        setComments((c) => ({ ...c, [postId]: null }));
      } finally {
        setCommentsLoading((s) => ({ ...s, [postId]: false }));
      }
    },
    [comments]
  );

  const openComments = (postId: string) => {
    setActiveCommentsPost(postId);
    if (!(postId in comments)) loadComments(postId);
  };
  const closeComments = () => setActiveCommentsPost(null);

  const submitComment = async (postId: string) => {
    const content = (newComment[postId] || "").trim();
    if (!content) return;
    const tempId = `temp-${Date.now()}`;
    const authorFallback = { username: "Tú", name: null, image: undefined };

    setComments((c) => {
      const prev = c[postId];
      if (prev === undefined || prev === null) {
        return { ...(c || {}), [postId]: [{ id: tempId, content, createdAt: new Date().toISOString(), author: authorFallback }] };
      }
      return { ...(c || {}), [postId]: [...prev, { id: tempId, content, createdAt: new Date().toISOString(), author: authorFallback }] };
    });

    setNewComment((s) => ({ ...s, [postId]: "" }));
    setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)));

    try {
      const res = await fetch(`/api/posts/${postId}/comment?includePost=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content }),
        credentials: "include",
      });

      if (res.status === 401) {
        setErrorMsg("Inicia sesión para comentar.");
        setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
        setComments((c) => ({ ...(c || {}), [postId]: (c[postId] || []).filter((cm: any) => cm.id !== tempId) }));
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "No se pudo publicar el comentario");
        setErrorMsg(txt || "No se pudo publicar el comentario");
        setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
        setComments((c) => ({ ...(c || {}), [postId]: (c[postId] || []).filter((cm: any) => cm.id !== tempId) }));
        return;
      }

      const data = await res.json();

      if (data && Array.isArray(data.comments)) {
        const list = data.comments.map((c: any) => ({
          id: c.id,
          content: c.content,
          createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt).toISOString(),
          author: {
            username: c.author?.username ?? c.author?.name ?? "Anon",
            name: c.author?.name ?? c.author?.username ?? null,
            image: c.author?.image ?? null,
          },
        })) as CommentType[];

        setComments((c) => ({ ...(c || {}), [postId]: list }));
        if (typeof data.commentsCount === "number") {
          setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: data.commentsCount } : p)));
        } else {
          setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: list.length } : p)));
        }
        return;
      }

      if (data && data.id) {
        const saved: CommentType = {
          id: data.id,
          content: data.content,
          createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date(data.createdAt).toISOString(),
          author: {
            username: data.author?.username ?? data.author?.name ?? "Anon",
            name: data.author?.name ?? data.author?.username ?? null,
            image: data.author?.image ?? null,
          },
        };

        setComments((c) => {
          const prev = c[postId];
          if (!prev || prev === null) return { ...(c || {}), [postId]: [saved] };
          return { ...(c || {}), [postId]: prev.map((cm) => (cm.id === tempId ? saved : cm)) };
        });
        return;
      }

      setComments((c) => ({ ...(c || {}), [postId]: (c[postId] || []).filter((cm: any) => cm.id !== tempId) }));
      setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
    } catch (_err) {
      console.error("Error publicando comentario:", _err);
      setErrorMsg("Error de red al publicar comentario");
      setPostsState((prev) => prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p)));
      setComments((c) => ({ ...(c || {}), [postId]: (c[postId] || []).filter((cm: any) => cm.id !== tempId) }));
    } finally {
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  return (
    <div className="min-h-screen font-sans bg-neutral-50 dark:bg-[#071019] text-neutral-900 dark:text-white transition-colors duration-300 antialiased">
      <div className="py-8 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <main className="lg:col-span-2">
          <header className="mb-6">
            <div className="rounded-xl p-6 bg-gradient-to-r from-zinc-900/60 to-transparent border border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">#{tag}</h1>
                <p className="mt-1 text-sm text-gray-400 max-w-prose">Publicaciones recientes con este hashtag — descubre conversaciones, comparte y participa.</p>

                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/6 border border-white/6 text-sm">
                    <strong className="font-semibold">{postsState.length}</strong>
                    publicaciones
                  </span>

                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className={`ml-2 px-3 py-1.5 rounded-full text-sm transition ${following ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                  >
                    {followLoading ? "..." : following ? "Siguiendo" : `Seguir #${tag}`}
                  </button>

                  <button
                    onClick={() => (window.location.href = `/?composer=${encodeURIComponent(`#${tag} `)}`)}
                    className="px-3 py-1.5 rounded-full border border-zinc-700 text-sm hover:bg-zinc-800 cursor-pointer"
                  >
                    Publicar con #{tag}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400">Ordenar:</div>
                <div className="inline-flex rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                  <button onClick={() => {}} className="px-3 py-1 text-sm hover:bg-zinc-800 cursor-pointer">Recientes</button>
                  <button onClick={() => {}} className="px-3 py-1 text-sm hover:bg-zinc-800 cursor-pointer">Populares</button>
                  <button onClick={() => {}} className="px-3 py-1 text-sm hover:bg-zinc-800 cursor-pointer">Con imagen</button>
                </div>
              </div>
            </div>
          </header>

          {!postsState || postsState.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-8 bg-white/80 dark:bg-black/50 backdrop-blur-sm text-center transition-colors shadow">
              <p className="text-gray-800 dark:text-gray-200 text-lg">No hay publicaciones con este hashtag aún.</p>
              <div className="mt-4">
                <Link href="/" className="inline-block px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer">Volver al inicio</Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-6">
              {postsState.map((p) => {
                const isLiked = !!likedMap[p.id];
                const anim = !!animateLike[p.id];
                return (
                  <li key={p.id} className="rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-gradient-to-b dark:from-[#071018] dark:to-[#051018] shadow-md hover:shadow-xl transition transform hover:-translate-y-0.5">
                    <div className="flex gap-4">
                      <Link href={`/user/${p.author.username}`} className="shrink-0 cursor-pointer">
                        <img src={p.author.image ?? "/default-avatar.png"} alt={p.author.name ?? p.author.username} loading="lazy" className="w-14 h-14 rounded-full object-cover border-2 border-transparent hover:border-indigo-400 transition" />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="truncate">
                            <Link href={`/user/${p.author.username}`} className="font-semibold hover:underline text-neutral-900 dark:text-neutral-100 text-base md:text-lg cursor-pointer">
                              {p.author.name ?? p.author.username}
                            </Link>
                            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">@{p.author.username} · <span className="text-gray-400 dark:text-gray-500">{timeAgo(p.createdAt)}</span></div>
                          </div>

                          <div className="text-xs text-gray-400">·</div>
                        </div>

                        <p className="mt-3 text-gray-800 dark:text-gray-200 text-sm md:text-base leading-7 break-words whitespace-pre-wrap">{p.content}</p>

                        {p.image && (
                          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
                            <img src={p.image} loading="lazy" alt="post image" className="w-full max-h-[480px] object-cover block" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.style.display = "none"; }} />
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm md:text-base">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(p.hashtags ?? []).map((h) => (
                              <Link key={h} href={`/hashtag/${encodeURIComponent(h.replace(/^#/, ""))}`} className="text-xs md:text-sm px-2 py-1 rounded-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-200 transition cursor-pointer">
                                #{h.replace(/^#/, "")}
                              </Link>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-sm md:text-base">
                            <div className="relative">
                              <button onClick={() => toggleLike(p.id)} aria-pressed={isLiked} aria-label={isLiked ? "Quitar like" : "Dar like"} disabled={!!loadingLike[p.id]} className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isLiked ? "bg-gradient-to-r from-pink-500 via-pink-400 to-red-400 text-white shadow-lg" : "bg-white dark:bg-transparent border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50"} cursor-pointer`}>
                                <span className={`relative inline-flex items-center justify-center w-7 h-7 transform transition-transform ${anim ? "scale-125" : "scale-100"}`}>
                                  {isLiked ? (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden><path d="M12 21s-7-4.35-9-7c-1.87-2.28-1-5 1-6 1.93-.95 4 0 4 0s1-3 6-3 6 3 6 3 2.07-.95 4 0c2 1 2.87 3.72 1 6-2 2.65-9 7-9 7z"/></svg>
                                  ) : (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                                  )}
                                </span>

                                <span className={`font-medium transition-transform ${animateLike[p.id] ? "scale-110" : "scale-100"}`}>{p.likesCount ?? 0}</span>
                              </button>
                            </div>

                            <button onClick={() => openComments(p.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 transition cursor-pointer" aria-label={`Comentarios ${p.commentsCount}`}>
                              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              <span className="font-medium text-gray-700 dark:text-gray-200">{p.commentsCount ?? 0}</span>
                            </button>

                            <Link href={`/post/${p.id}`} className="text-xs md:text-sm text-gray-500 hover:underline cursor-pointer">Ver</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <RightSidebar activeTag={tag} />
          </div>
        </aside>
      </div>

      {/* Modal de comentarios */}
      {activeCommentsPost && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="comments-title">
          <div className="fixed inset-0 bg-black/40" onClick={closeComments} />
          <div className="relative w-full md:w-3/4 lg:w-2/3 max-h-[90vh] overflow-auto rounded-t-xl md:rounded-xl bg-white dark:bg-[#07101a] p-4 md:p-6 m-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 id="comments-title" className="text-lg font-semibold">Comentarios</h2>
              <button onClick={closeComments} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 cursor-pointer">Cerrar</button>
            </div>

            <div className="space-y-4">
              {commentsLoading[activeCommentsPost] ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {Array.isArray(comments[activeCommentsPost]) ? (
                      (comments[activeCommentsPost] as CommentType[]).map((c) => (
                        <div key={c.id} className="flex gap-3 items-start">
                          <img src={c.author.image ?? "/default-avatar.png"} className="w-9 h-9 rounded-full object-cover cursor-pointer" alt={c.author.name ?? c.author.username} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{c.author.name ?? c.author.username} <span className="text-xs text-gray-400">@{c.author.username} · {timeAgo(c.createdAt)}</span></div>
                            <div className="text-sm text-gray-700 dark:text-gray-200 mt-1 whitespace-pre-wrap">{c.content}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500">No se pueden cargar comentarios anteriores (GET no disponible). Puedes publicar uno.</div>
                    )}
                    {Array.isArray(comments[activeCommentsPost]) && (comments[activeCommentsPost] as CommentType[]).length === 0 && <div className="text-gray-500">Sé el primero en comentar</div>}
                  </div>

                  <div className="mt-4">
                    <label htmlFor="comment-input" className="sr-only">Escribe un comentario</label>
                    <textarea id="comment-input" rows={3} value={newComment[activeCommentsPost] ?? ""} onChange={(e) => setNewComment((s) => ({ ...s, [activeCommentsPost]: e.target.value }))} className="w-full rounded-md p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0b0710] text-sm" placeholder="Escribe tu comentario..." />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button onClick={() => setNewComment((s) => ({ ...s, [activeCommentsPost]: "" }))} className="px-3 py-1 text-sm rounded-md cursor-pointer">Cancelar</button>
                      <button onClick={() => submitComment(activeCommentsPost)} className="px-4 py-1 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer">Publicar</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast de error */}
      {errorMsg && (
        <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-60 bg-red-50 text-red-700 px-4 py-2 rounded-md border border-red-200 shadow">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// SSR
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const rawTag = String(ctx.params?.tag ?? "");
  const tag = rawTag.replace(/^#/, "").trim();
  if (!tag) return { notFound: true };

  try {
    const postsData = await prisma.post.findMany({
      where: {
        OR: [{ hashtags: { has: tag } }, { content: { contains: `#${tag}`, mode: "insensitive" } }],
      },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
        likes: { select: { id: true, userId: true } },
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const safe = postsData.map((p) => {
      const fromArray = Array.isArray(p.hashtags) ? p.hashtags.map(String) : [];
      const fromContent = extractHashtagsFromText(p.content || "");
      const mergedSet = new Map<string, string>();
      [...fromArray, ...fromContent].forEach((h) => {
        const clean = String(h).replace(/^#/, "").trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (!mergedSet.has(key)) mergedSet.set(key, clean);
      });
      const merged = Array.from(mergedSet.values());

      return {
        id: p.id,
        content: p.content,
        image: p.image ?? null,
        createdAt: p.createdAt.toISOString(),
        author: { id: p.author.id, username: p.author.username, name: p.author.name ?? null, image: p.author.image ?? null },
        hashtags: merged,
        likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
        commentsCount: Array.isArray(p.comments) ? p.comments.length : 0,
      } as PostItem;
    });

    const session = await getServerSession(ctx.req, ctx.res, authOptions);
    let likedPostIds: string[] = [];
    let initialFollowing = false;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (user) {
        const likes = await prisma.like.findMany({ where: { userId: user.id, postId: { in: safe.map((s) => s.id) } }, select: { postId: true } });
        likedPostIds = likes.map((l) => l.postId);

        // comprobar si sigue el hashtag
        const hf = await prisma.hashtagFollow.findFirst({ where: { userId: user.id, tag } });
        initialFollowing = !!hf;
      }
    }

    return { props: { tag: tag.replace(/^#/, ""), posts: safe, likedPostIds, initialFollowing } };
  } catch (error) {
    console.error("Error en hashtag page:", error);
    return { props: { tag: tag.replace(/^#/, ""), posts: [], likedPostIds: [], initialFollowing: false } };
  }
};
