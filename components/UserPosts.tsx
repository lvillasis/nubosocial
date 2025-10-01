// components/UserPosts.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import NewCommentFormFull from "@/pages/components/NewCommentFormFull";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";

type Comment = { id: string; content: string; author?: { name?: string | null } };
type Post = {
  id: string;
  content: string;
  createdAt: string;
  image?: string | null;
  likes?: { userId: string }[];
  comments?: Comment[];
  author?: { id?: string; name?: string | null; image?: string | null; username?: string | null };
};

const LS_KEY_PREFIX = "nubo_likes_for_user_"; // localStorage key prefix

export default function UserPosts({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const sessionUserId = (session as any)?.user?.id ?? null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [liking, setLiking] = useState<Record<string, boolean>>({});
  const [localLikedSet, setLocalLikedSet] = useState<Record<string, boolean>>({});

  // localStorage namespace per logged user (so each user keeps their own remembered likes)
  const lsKey = useMemo(() => (sessionUserId ? `${LS_KEY_PREFIX}${sessionUserId}` : null), [sessionUserId]);

  // Load localStorage remembered likes
  useEffect(() => {
    if (!lsKey) {
      setLocalLikedSet({});
      return;
    }
    try {
      const raw = localStorage.getItem(lsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setLocalLikedSet(parsed);
    } catch {
      setLocalLikedSet({});
    }
  }, [lsKey]);

  // Save local liked set when changes
  useEffect(() => {
    if (!lsKey) return;
    try {
      localStorage.setItem(lsKey, JSON.stringify(localLikedSet));
    } catch {
      // ignore
    }
  }, [localLikedSet, lsKey]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts/byUser?userId=${encodeURIComponent(userId)}&limit=20`);
        if (!res.ok) throw new Error("fetch posts failed");
        const json = await res.json();
        if (!mounted) return;
        // normalize: expect array or { posts: [] }
        const arr: Post[] = Array.isArray(json) ? json : json.posts ?? [];
        setPosts(arr);
      } catch (_err) {
        console.error("UserPosts load error:", err);
        setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // helper: determine if post is liked by current user (server state OR remembered local)
  const isPostLiked = (post: Post) => {
    const likedOnServer = !!post.likes?.some((l) => l.userId === sessionUserId);
    const likedLocal = !!localLikedSet[post.id];
    return likedOnServer || likedLocal;
  };

  const updatePostLocally = (updated: Partial<Post> & { id: string }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const handleLike = async (postId: string) => {
    // prevent spamming
    if (liking[postId]) return;
    setLiking((s) => ({ ...s, [postId]: true }));

    // Optimistic UI: flip local cache immediately
    setLocalLikedSet((s) => {
      const next = { ...s, [postId]: !s[postId] };
      return next;
    });

    // Also update local posts count instantly (optimistic)
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const likedBefore = !!p.likes?.some((l) => l.userId === sessionUserId);
        // If likedBefore true -> remove one; else add one
        const newLikes = likedBefore ? (p.likes || []).filter((l) => l.userId !== sessionUserId) : [...(p.likes || []), { userId: sessionUserId ?? "local" }];
        return { ...p, likes: newLikes };
      })
    );

    try {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "like failed");

      // Server responds { liked: boolean } or similar. We'll reconcile:
      const liked = Boolean(json.liked);
      // Update post likes array to reflect server (simplified)
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          if (liked) {
            // ensure the current user is present (server truth)
            const already = p.likes?.some((l) => l.userId === sessionUserId);
            return { ...p, likes: already ? p.likes : [...(p.likes || []), { userId: sessionUserId ?? "server" }] };
          } else {
            return { ...p, likes: (p.likes || []).filter((l) => l.userId !== sessionUserId) };
          }
        })
      );

      // update local cache to match server (so remembered likes reflect server)
      setLocalLikedSet((prev) => {
        const next = { ...prev };
        if (liked) next[postId] = true;
        else delete next[postId];
        return next;
      });
    } catch (_err) {
      console.error("like error", err);
      // revert optimistic UI if error: toggle local set back and refetch post
      setLocalLikedSet((s) => {
        const next = { ...s };
        next[postId] = !next[postId];
        if (!next[postId]) delete next[postId];
        return next;
      });
      // refetch single post to be safe (best-effort)
      try {
        const res2 = await fetch(`/api/posts/byUser?userId=${encodeURIComponent(userId)}&limit=50`);
        if (res2.ok) {
          const json = await res2.json();
          const arr: Post[] = Array.isArray(json) ? json : json.posts ?? [];
          setPosts(arr);
        }
      } catch {}
      alert("No se pudo actualizar like. Intenta de nuevo.");
    } finally {
      setLiking((s) => ({ ...s, [postId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl p-4 bg-gradient-to-br from-white/60 to-gray-50 dark:from-[#0b1220] dark:to-[#0d1724]">
            <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <p className="text-gray-500 dark:text-gray-400">No hay publicaciones aún.</p>;
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {posts.map((post) => {
          const liked = isPostLiked(post);

          return (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              layout
              className="bg-gradient-to-br from-white/60 to-gray-50 dark:from-[#0b1220] dark:to-[#0d1724] text-black dark:text-white rounded-2xl shadow-md p-5"
            >
              <header className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-transparent">
                    {post.author?.image ? (
                      <Image src={post.author.image} alt={post.author.name || "avatar"} width={44} height={44} className="object-cover rounded-full" unoptimized />
                    ) : (
                      <div className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{post.author?.name || "Anónimo"}</div>
                      <div className="text-xs text-gray-400 truncate">{post.author?.username ? `@${post.author.username}` : ""}</div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(post.createdAt), "dd MMM yyyy • HH:mm")}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-400">{/* menu placeholder */}</div>
              </header>

              <div className="mt-4 text-base leading-relaxed break-words">{post.content}</div>

              {post.image && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <img src={post.image} alt="post image" className="w-full object-cover max-h-[520px]" />
                </div>
              )}

              <footer className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <motion.button
                      onClick={() => handleLike(post.id)}
                      disabled={liking[post.id]}
                      className="flex items-center gap-2 text-sm focus:outline-none"
                      aria-pressed={liked}
                      title="Me gusta"
                      whileTap={{ scale: 0.92 }}
                    >
                      <motion.div
                        animate={liked ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                        transition={{ duration: 0.28 }}
                      >
                        <Heart
                          size={18}
                          fill={liked ? "#ec4899" : "transparent"}
                          stroke={liked ? "#ec4899" : "currentColor"}
                          className="cursor-pointer"
                        />
                      </motion.div>
                      <motion.span
                        key={post.likes?.length ?? 0}
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className="text-sm"
                      >
                        {post.likes?.length || 0}
                      </motion.span>
                    </motion.button>
                  </div>

                  <button
                    onClick={() => setExpandedComments((s) => ({ ...s, [post.id]: !s[post.id] }))}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
                  >
                    {expandedComments[post.id] ? "Ocultar comentarios" : `Comentarios (${post.comments?.length || 0})`}
                  </button>

                  <button
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator.share({ title: "Mira este post", text: post.content, url: `${location?.origin ?? ""}/post/${post.id}` });
                      } else {
                        alert("Compartir no es compatible con tu navegador.");
                      }
                    }}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500"
                  >
                    🔗 Compartir
                  </button>

                  <button onClick={() => alert("Retweet próximamente")} className="text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-400">
                    🔁 Retweet
                  </button>
                </div>

                <div className="text-xs text-gray-400">{/* extra actions placeholder */}</div>
              </footer>

              <AnimatePresence initial={false}>
                {expandedComments[post.id] && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                      {post.comments && post.comments.length === 0 ? (
                        <p className="text-sm text-gray-400">No hay comentarios aún.</p>
                      ) : (
                        post.comments?.map((c) => (
                          <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-2">
                            <span className="font-semibold">{c.author?.name || "Anónimo"}:</span> {c.content}
                          </div>
                        ))
                      )}

                      <NewCommentFormFull postId={post.id} onCommentAdded={(p) => updatePostLocally(p as any)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
