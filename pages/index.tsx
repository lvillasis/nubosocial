// pages/index.tsx
import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import NewPostForm from "@/pages/components/NewPostForm";
import NewCommentFormSimple from "@/pages/components/NewCommentFormSimple";
import UserSidebarCard from "@/pages/components/UserSidebarCard";
import SearchBar from "./components/SearchBar";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { triggerLikeExplosion } from "@/utils/likeAnimation";
import Link from "next/link";
import RightSidebar from "@/components/RightSidebar";

// ----- tipos actualizados -----
interface Comment {
  id: string;
  content: string;
  author?: { name: string };
}

export interface Like {
  id: string;
  postId?: string;
  userId?: string;
  createdAt?: string;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id?: string;
    name: string;
    image: string | null;
    username?: string;
  };
  likes?: Like[];           // relación en Prisma
  likesCount?: number;      // si el servidor lo devuelve
  liked?: boolean;          // si el usuario actual ya dio like (opcional)
  comments?: Comment[];
  image?: string | null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await serverSideTranslations(context.locale || "es", ["common"])),
    },
  };
}

export default function Home() {
  const { t } = useTranslation("common");
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    fetchPosts({ showLoader: true }); // 👈 Solo mostramos loader la 1ª vez
     
  }, []);

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // -------- fetchPosts normalizado --------
  const fetchPosts = async ({ showLoader = false } = {}) => {
    if (showLoader) setInitialLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Error al obtener posts");
      const raw = await res.json();

      // soportar: [{...}, {...}] o { posts: [...] }
      const arr = Array.isArray(raw) ? raw : raw.posts ?? [];

      const normalized: Post[] = arr.map((p: any) => {
        // p puede traer _count, likes, likedBy, liked, likesCount...
        const likesArr: Like[] = p.likes ?? p.likedBy ?? [];
        const likesCountFromCount = p._count?.likes ?? undefined;
        const likesCount = p.likesCount ?? likesCountFromCount ?? (Array.isArray(likesArr) ? likesArr.length : 0);

        return {
          ...p,
          // asegurar campos esperados
          likes: likesArr,
          likesCount,
          // si tu endpoint devuelve si el usuario hizo like, mantenlo (p.liked o p.likedBy includes user)
          liked: p.liked ?? false,
        } as Post;
      });

      setPosts(normalized);
    } catch (_err) {
      console.error("fetchPosts error:", _err);
      setError("No se pudieron cargar los posts.");
    } finally {
      if (showLoader) setInitialLoading(false);
    }
  };

  // -------- handleLike con optimismo y revert en fallo --------
  const handleLike = async (postId: string) => {
    // optimista: aumentar contador local y marcar liked=true
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likesCount: (post.likesCount ?? post.likes?.length ?? 0) + 1,
              liked: true,
              likes: [...(post.likes ?? []), { id: "optimistic-" + Date.now() }],
            }
          : post
      )
    );

    try {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (!res.ok) {
        // revertir si falla
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likesCount: Math.max((post.likesCount ?? post.likes?.length ?? 1) - 1, 0),
                  liked: false,
                  likes: (post.likes ?? []).slice(0, -1),
                }
              : post
          )
        );
        console.error("Error al guardar like en el servidor");
        return;
      }

      const data = await res.json().catch(() => ({}));

      // si el servidor devuelve el estado real, sincronízalo
      if (data && (typeof data.likesCount === "number" || typeof data.liked === "boolean")) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, likesCount: data.likesCount ?? post.likesCount, liked: data.liked ?? post.liked }
              : post
          )
        );
      } else {
        // fallback: trigger animation
        triggerLikeExplosion(postId);
      }
    } catch (_err) {
      // revertir en error de red
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: Math.max((post.likesCount ?? post.likes?.length ?? 1) - 1, 0),
                liked: false,
                likes: (post.likes ?? []).slice(0, -1),
              }
            : post
        )
      );
      console.error("Error al enviar like:", _err);
    }
  };

  if (status === "loading") {
    return <p className="text-gray-400 text-sm text-center mt-10">Cargando sesión...</p>;
  }

  if (!session || !session.user) {
    return <p className="text-red-500 text-center mt-10">Sesión no disponible</p>;
  }

  const handleDelete = async (postId: string) => {
    const confirmed = confirm("¿Seguro que deseas eliminar este post?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/posts/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Error: " + data.error);
        return;
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (_err) {
      console.error("❌ Error en handleDelete:", _err);
      alert("Error al eliminar el post");
    }
  };

  const addCommentToPost = (postId: string, comment: Comment) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments: [...(post.comments || []), comment] } : post
      )
    );
  };

  // ----------------- RENDER (sin cambios estructurales) -----------------
  return (
    <>
      <Head>
        <title>Inicio | Nubo</title>
        <meta name="description" content="Descubre y comparte contenido en Nubo, tu nueva red social" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen font-sans bg-neutral-50 dark:bg-[#0d1117] text-neutral-900 dark:text-white transition-colors duration-300 px-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 py-10">
          {/* Sidebar Izquierdo */}
          <aside className="hidden lg:block w-64 sticky top-6 self-start h-fit rounded-2xl glass p-4 border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.04)] transition-colors">
            {session && (
              <UserSidebarCard
                user={{
                  id: session.user.id,
                  name: session.user.name || "Sin nombre",
                  username: (session.user as any).username || "sin-usuario",
                  image: session.user.image || "/default-avatar.png",
                }}
              />
            )}
          </aside>

          {/* Feed Principal */}
          <main className="flex-1 max-w-3xl w-full mx-auto">
            <div className="glass rounded-2xl p-5 mb-8 shadow-card border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.04)] transition-colors">
              <NewPostForm onPostCreated={() => fetchPosts({ showLoader: true })} />
            </div>

            {initialLoading ? (
              <p className="text-center text-gray-500 dark:text-gray-400">{t("Cargando publicaciones...")}</p>
            ) : error ? (
              <p className="text-center text-rose-600 dark:text-rose-400">{error}</p>
            ) : posts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">{t("No hay publicaciones aún.")}</p>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      layout
                      className="glass rounded-2xl p-5 shadow-card border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.03)] transition-colors duration-200 space-y-4"
                    >
                      {/* Fecha */}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(post.createdAt), "dd MMM yyyy HH:mm")}
                      </p>

                      {/* Usuario */}
                      <div className="flex items-center gap-3">
                        <Image
                          src={post.author?.image ?? "/default-avatar.png"}
                          alt={`Avatar de ${post.author?.name || "usuario"}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover ring-1 ring-[rgba(0,0,0,0.04)] dark:ring-[rgba(255,255,255,0.03)]"
                        />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {post.author?.name || "Anónimo"}
                        </p>
                      </div>

                      <Link href={`/post/${post.id}`} className="block rounded-lg p-2 transition hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.02)]">
                        {/* Contenido */}
                        <p className="text-[15px] text-gray-800 dark:text-slate-100 leading-relaxed">{post.content}</p>

                        {/* Imagen */}
                        {post.image?.trim() && (
                          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.03)] mt-4">
                            <Image src={post.image} alt="Imagen del post" layout="fill" objectFit="cover" className="rounded-xl" />
                          </div>
                        )}
                      </Link>

                      {/* Botones de acción */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.03)]">
                        {/* Like */}
                        <div className="relative inline-block">
                          <button
                            id={`like-button-${post.id}`}
                            onClick={() => {
                              handleLike(post.id);
                              triggerLikeExplosion(post.id);
                            }}
                            className="relative flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(124,58,237,0.08)] dark:bg-[rgba(124,58,237,0.12)] text-[var(--primary-fallback)] cursor-pointer transition"
                          >
                            <span className="heart-icon">❤️</span>
                            {/* contador seguro: usa likesCount si existe o calcula length */}
                            <span>{post.likesCount ?? post.likes?.length ?? 0}</span>
                          </button>
                        </div>

                        {/* Comentarios */}
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1 hover:text-blue-500 transition cursor-pointer"
                          title="Ver comentarios"
                        >
                          💬 <span>{post.comments?.length ?? 0}</span>
                        </button>

                        {/* Retuitear */}
                        <button
                          onClick={async () => {
                            const newContent = `🔁 ${post.content}`;
                            const body = JSON.stringify({ content: newContent, image: post.image });
                            await fetch("/api/posts/new", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body,
                            });
                            fetchPosts({ showLoader: true });
                          }}
                          className="flex items-center gap-1 hover:text-teal-500 transition cursor-pointer"
                          title="Compartir como retuit"
                        >
                          🔁 <span>Retuitear</span>
                        </button>

                        {/* Compartir */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                            alert("📋 Enlace copiado");
                          }}
                          className="flex items-center gap-1 hover:text-green-500 transition cursor-pointer"
                          title="Compartir enlace"
                        >
                          🔗 <span>Compartir</span>
                        </button>

                        {/* Eliminar (solo si el usuario es el autor) */}
                        {session.user.id === (post as any).authorId && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="flex items-center gap-1 text-rose-500 hover:text-rose-400 transition cursor-pointer"
                            title="Eliminar publicación"
                          >
                            🗑️ <span>Eliminar</span>
                          </button>
                        )}
                      </div>

                      {/* Comentarios (si están abiertos) */}
                      {expandedComments[post.id] && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm text-sky-500 font-semibold">Comentarios</h4>

                          {post.comments?.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-400">No hay comentarios aún.</p>
                          ) : (
                            <AnimatePresence initial={false}>
                              {post.comments?.map((comment) => (
                                <motion.div
                                  key={comment.id}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.25 }}
                                  layout
                                  className="text-sm text-slate-800 dark:text-slate-300 border-l-2 border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.03)] pl-3"
                                >
                                  <span className="font-semibold">{comment.author?.name || "Anónimo"}:</span>{" "}
                                  {comment.content}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          )}

                          <NewCommentFormSimple postId={post.id} onCommentAdded={(newComment) => addCommentToPost(post.id, newComment)} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </main>

          {/* Sidebar Derecho */}
          <aside className="hidden lg:block w-80 sticky top-6 self-start h-fit rounded-2xl glass p-6 space-y-8 border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.04)] transition-colors">
            <RightSidebar t={t} />
          </aside>
        </div>
      </div>
    </>
  );
}
