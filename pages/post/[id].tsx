// pages/post/[id].tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { triggerLikeExplosion } from "@/utils/likeAnimation";
import { useTranslation } from "next-i18next";
import UserSidebarCard from "@/components/UserSidebarCard";
import RightSidebar from "@/components/RightSidebar";

export default function PostDetail() {
  const { data: session } = useSession();
  const { t } = useTranslation("common");

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);

  // Obtener id del path (solo en cliente) y activar flag de cliente
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/post\/([^\/]+)/);
      if (match && match[1]) setRouteId(match[1]);
    }
  }, []);

  useEffect(() => {
    if (isClient && routeId) {
      fetchPost(routeId);
    }
  }, [isClient, routeId]);

  const fetchPost = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) {
        setPost(null);
        return;
      }
      const data = await res.json();
      setPost(data);
    } catch (error) {
      console.error("fetchPost error:", error);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!session) {
      alert("Inicia sesión para dar like");
      return;
    }

    try {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.liked) {
          triggerLikeExplosion(postId);
        }

        setPost((prev: any) =>
          prev ? { ...prev, likesCount: data.likesCount, liked: data.liked } : prev
        );
      }
    } catch (error) {
      console.error("Error al dar like:", error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      alert("Inicia sesión para comentar");
      return;
    }
    if (!commentText.trim() || !routeId) return;

    try {
      const res = await fetch(`/api/posts/${routeId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) return;
      const newComment = await res.json();

      setPost((prev: any) =>
        prev ? { ...prev, comments: [newComment, ...prev.comments] } : prev
      );
      setCommentText("");
    } catch (error) {
      console.error("Error al comentar:", error);
    }
  };

  // 🚫 Evita renderizar en servidor (SSR/prerender). Mostramos carga mientras se obtiene id y post.
  if (!isClient) {
    return <p className="p-4 text-gray-400">Cargando...</p>;
  }

  if (loading) return <p className="p-4 text-gray-400">Cargando...</p>;
  if (!post) return <p className="p-4 text-red-400">Post no encontrado</p>;

  return (
    <div className="flex justify-center bg-gradient-to-b from-gray-950 to-black min-h-screen text-white px-2 sm:px-4">
      {session ? (
        <>
          {/* Sidebar Izquierdo */}
          <aside className="hidden lg:block w-64 sticky top-6 self-start h-fit bg-white dark:bg-gray-900 text-black dark:text-white rounded-2xl shadow-xl p-4 border border-gray-300 dark:border-gray-700 transition-colors">
            <UserSidebarCard
              user={{
                id: session.user.id ?? "",
                name: session.user.name || "Sin nombre",
                username: (session.user as any)?.username || "sin-usuario",
                image: session.user.image || "/default-avatar.png",
              }}
            />
          </aside>

          {/* Columna central */}
          <main className="w-full max-w-2xl p-4">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Autor */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={post.author.image || "/default-avatar.png"}
                  alt={post.author.name}
                  className="w-14 h-14 rounded-full border border-gray-700 shadow-sm"
                />
                <div>
                  <p className="font-bold text-lg">{post.author.name}</p>
                  <p className="text-sm text-gray-400">@{post.author.username}</p>
                </div>
              </div>

              {/* Contenido */}
              <p className="text-xl leading-relaxed whitespace-pre-line">{post.content}</p>
              {post.image && (
                <img
                  src={post.image}
                  alt="Imagen del post"
                  className="rounded-xl mt-4 max-h-[500px] w-full object-cover border border-gray-800 shadow-md"
                />
              )}

              <p className="text-sm text-gray-500 mt-3">
                {new Date(post.createdAt).toLocaleString()}
              </p>

              {/* Botones */}
              <div className="flex items-center gap-6 mt-5">
                <button
                  id={`like-button-${post.id}`}
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                    post.liked ? "bg-red-600 hover:bg-red-500 scale-105" : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  ❤️ <span>{post.likesCount || 0}</span>
                </button>
                <span className="flex items-center gap-1 text-gray-300">💬 {post.comments.length}</span>
              </div>

              {/* Comentarios */}
              <hr className="my-6 border-gray-800" />
              <form onSubmit={handleComment} className="flex gap-2 mb-6">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 bg-gray-800 text-white border border-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                >
                  Enviar
                </button>
              </form>

              <h3 className="font-bold text-lg mb-3">Comentarios</h3>
              {post.comments.length === 0 && <p className="text-gray-400">No hay comentarios aún</p>}
              <div className="space-y-4">
                {post.comments.map((comment: any) => (
                  <div key={comment.id} className="border border-gray-800 p-4 rounded-lg bg-gray-900 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={comment.author.image || "/default-avatar.png"}
                        alt={comment.author.name}
                        className="w-8 h-8 rounded-full border border-gray-700"
                      />
                      <p className="font-semibold">{comment.author.name}</p>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* Sidebar Derecho */}
          <aside className="hidden lg:block w-80 sticky top-6 self-start h-fit rounded-2xl glass p-6 space-y-8 border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.04)] transition-colors">
            <RightSidebar t={t} />
          </aside>
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-screen">
          <p className="text-lg text-gray-300">🔒 Debes iniciar sesión para ver este contenido.</p>
        </div>
      )}
    </div>
  );
}

// ✅ Evita el error "NextRouter was not mounted" y mantiene i18n
export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "es", ["common"])),
    },
  };
}
