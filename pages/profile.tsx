  // pages/profile.tsx - inicio-buscar-notificaciones-mensajes-configuración...

  import { GetServerSidePropsContext } from "next";
  import { getServerSession } from "next-auth/next";
  import { getSession } from "next-auth/react";
  import { authOptions } from "@/lib/authOptions";
  import { serverSideTranslations } from "next-i18next/serverSideTranslations";
  import { useTranslation } from "next-i18next";
  import Link from "next/link";
  import { useRouter } from "next/router";
  import { useEffect, useState } from "react";
  import type { Session } from "next-auth";
  import NewPostForm from "@/components/NewPostForm";
  import NewCommentFormFull from "@/components/NewCommentFormFull";
  import { toast } from "react-toastify";
  import SearchBar from "@/components/SearchBar";
  import { format } from "date-fns";
  import { motion, AnimatePresence } from "framer-motion";
  import { Heart } from "lucide-react";
  import ProfileSidebar from "@/components/ProfileSidebar";
  import EditProfileModal from "@/components/EditProfileModal";
  import RightSidebar from "@/components/RightSidebar";
  import { useProfileUpdate } from "@/hooks/useProfileUpdate";
  import type { PostWithRelations } from "@/types/domain";


  interface Props {
    session: Session;
    userInDb: {
      id: string;
      name: string;
      email: string;
      username: string;
      image?: string | null;
      coverImage?: string | null;
      bio?: string | null;
      location?: string | null;
      language?: string;              // 👈 nuevo
      emailNotifications?: boolean;   // 👈 nuevo
    };
    followersCount: number; 
    followingCount: number;
  }

  interface Comment {
    id: string;
    content: string;
    author: { name: string | null };
  }

  interface Post {
    id: string;
    content: string;
    createdAt: string;
    image?: string;
    likes?: { userId: string }[];
    comments: Comment[];
    author?: {
      id?: string;
      name: string | null;
      image: string | null;
    };
  }

  export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await getServerSession(context.req, context.res, authOptions);

    if (!session || !session.user) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    // import dinámico prisma
    const { prisma } = await import("@/lib/prisma");

    const userInDb = await prisma.user.findUnique({
      where: { email: session.user.email || "" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
        coverImage: true,
        bio: true,
        location: true,
        language: true,
        emailNotifications: true, 
      },
    });

    if (!userInDb) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    // contadores social (server-side) — followers = quien te sigue; following = a quien sigues
    const followersCount = await prisma.userLike.count({ where: { userId: userInDb.id } });
    const followingCount = await prisma.userLike.count({ where: { likedById: userInDb.id } });

    return {
      props: {
        session: {
          ...session,
          user: {
            ...session.user,
            image: userInDb?.image ?? null,
          },
        },
        userInDb: {
          ...userInDb,
          name: userInDb.name ?? "Sin nombre",
          username: userInDb.username ?? "sin-usuario",
          email: userInDb.email ?? "sin-email",
          image: userInDb.image ?? null,
          coverImage: userInDb.coverImage ?? null,
          bio: userInDb.bio ?? "Sin biografía",
          location: userInDb.location ?? "Sin ubicación",
        },
        followersCount,
        followingCount,
        ...(await serverSideTranslations(context.locale || "es", ["common"])),
      },
    };
  }

  export default function ProfilePage({ session, userInDb, followersCount: initialFollowers, followingCount: initialFollowing }: Props) {
    const { t } = useTranslation("common");
    const router = useRouter();
    const user = userInDb;

    // Estados del perfil
    const [name, setName] = useState(user?.name || "Sin nombre");
    const [image, setImage] = useState<string>(user?.image || "/default-avatar.png");
    const [coverImage, setCoverImage] = useState<string>(user?.coverImage || "/default-cover.png");
    const [bio, setBio] = useState(user?.bio || "Sin biografía");
    const [location, setLocation] = useState(user?.location || "Sin ubicación");

    // social counters (client-side actualizables)
    const [followersCount, setFollowersCount] = useState<number>(initialFollowers ?? 0);
    const [followingCount, setFollowingCount] = useState<number>(initialFollowing ?? 0);

    // Resto de estados / UI
   const [posts, setPosts] = useState<PostWithRelations[]>(/* initial */[]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [activeTab, setActiveTab] = useState<"posts" | "media" | "likes">("posts");
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [animatingPostId, setAnimatingPostId] = useState<string | null>(null);
    const [burstHearts, setBurstHearts] = useState<{ id: string; angle: number; distance: number }[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const { uploadThenUpdate } = useProfileUpdate();

    

    const [profileData, setProfileData] = useState({
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      image: user?.image || "/default-avatar.png",
      coverImage: user?.coverImage || "",
      bio: user?.bio || "",
      location: user?.location || "",
    });


    // polling followers count (cada 7s)
    useEffect(() => {
      let mounted = true;
      const tick = async () => {
        try {
          const res = await fetch(`/api/user/followersCount?userId=${encodeURIComponent(user.id)}`);
          if (!res.ok) return;
          const json = await res.json();
          if (!mounted) return;
          if (typeof json.count === "number") setFollowersCount(json.count);
        } catch (_err) {
          /* ignore */
        }
      };
      tick();
      const id = setInterval(tick, 7000);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }, [user.id]);

    // -------------------------
    // Upload (llama a /api/upload)
    // -------------------------
    const handleUpload = async (file: File, type: "avatar" | "cover") => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          toast.success("✅ Imagen actualizada");

          if (type === "avatar") {
            setImage(data.fileUrl);
            setProfileData((p) => ({ ...p, image: data.fileUrl }));
          } else {
            setCoverImage(data.fileUrl);
            setProfileData((p) => ({ ...p, coverImage: data.fileUrl }));
          }

          await getSession();
          router.replace("/profile");
        } else {
          toast.error("❌ Error al actualizar imagen");
        }
      } catch (error) {
        console.error("Error subiendo imagen:", error);
        toast.error("❌ Error de conexión");
      }
    };

    // -------------------------
    // Posts
    // -------------------------
    const fetchPosts = async () => {
      if (!user?.id) return;
      setLoadingPosts(true);
      try {
        const res = await fetch(`/api/posts/user/${user.id}`);
        if (!res.ok) {
          console.error("Error fetching posts:", await res.text());
          setPosts([]);
          setLoadingPosts(false);
          return;
        }
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Error al cargar publicaciones:", error);
        setPosts([]);
      }
      setLoadingPosts(false);
    };

    useEffect(() => {
      fetchPosts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const updatePostLocally = (updatedPost: PostWithRelations) => {
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    };

    const filteredPosts = () => {
      if (activeTab === "media") return posts.filter((p) => p.image);
      if (activeTab === "likes") return posts.filter((p) => p.likes?.length);
      return posts;
    };

    // -------------------------
    // Likes con burst
    // -------------------------
    useEffect(() => {
      if (!animatingPostId) return;
      const timeout = setTimeout(() => setAnimatingPostId(null), 400);
      return () => clearTimeout(timeout);
    }, [animatingPostId]);

    const handleLikeWithBurst = async (postId: string) => {
      setAnimatingPostId(postId);
      const post = posts.find((p) => p.id === postId);
      const alreadyLiked = post?.likes?.some((like) => like.userId === user.id);

      try {
        const res = await fetch("/api/posts/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });

        const data = await res.json();

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes: data.liked
                    ? [...(post.likes || []), { userId: user.id }]
                    : (post.likes || []).filter((like) => like.userId !== user.id),
                }
              : post
          )
        );

        if (!alreadyLiked && data.liked) {
          const newBurst = Array.from({ length: 8 }).map((_, i) => ({
            id: Math.random().toString(36).slice(2),
            angle: (i * 360) / 8,
            distance: 40 + Math.random() * 20,
          }));

          setBurstHearts(newBurst);
          setTimeout(() => setBurstHearts([]), 800);
        }
      } catch (error) {
        console.error("Error al dar like:", error);
      }
    };

    // -------------------------
    // Actualizar perfil (API)
    // -------------------------
    const handleUpdate = async () => {
      try {
        const res = await fetch("/api/user/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, image, coverImage, bio, location }),
        });

        if (res.ok) {
          await getSession();
          toast.success("Perfil actualizado con éxito.");
          setProfileData((p) => ({ ...p, name, image, coverImage, bio, location }));
        } else {
          toast.error("Error al actualizar el perfil.");
        }

        await getSession();
        router.replace("/profile");
      } catch (error) {
        console.error("Error actualizando perfil:", error);
        toast.error("Error actualizando perfil.");
      }
    };

    const handleProfileSaved = async (values: {
      name: string;
      bio: string;
      location: string;
      image?: File | string | null;
      coverImage?: File | string | null;
    }) => {
      try {
        const avatarFile = values.image instanceof File ? values.image : null;
        const coverFile = values.coverImage instanceof File ? values.coverImage : null;

        const result = await uploadThenUpdate({
          name: values.name,
          bio: values.bio,
          location: values.location,
          avatarFile,
          coverFile,
        });

        const updatedUser = (result as any)?.user ?? result;

        if (updatedUser) {
          setName(updatedUser.name ?? values.name);
          setBio(updatedUser.bio ?? values.bio);
          setLocation(updatedUser.location ?? values.location);
          if (updatedUser.image) setImage(updatedUser.image);
          if (updatedUser.coverImage) setCoverImage(updatedUser.coverImage);
          setProfileData((p) => ({ ...p, ...updatedUser }));
        } else {
          setName(values.name);
          setBio(values.bio);
          setLocation(values.location);
          if (typeof values.image === "string") setImage(values.image);
          if (typeof values.coverImage === "string") setCoverImage(values.coverImage);
          setProfileData((p) => ({ ...p, name: values.name, bio: values.bio, location: values.location }));
        }

        toast.success("Perfil actualizado correctamente");
        return updatedUser;
      } catch (err: any) {
        console.error("Error guardando perfil:", err);
        toast.error("No se pudo actualizar el perfil");
        throw err;
      }
    };

    const handleDelete = async (postId: string) => {
      const confirmDelete = window.confirm("🗑️ ¿Estás seguro de que deseas eliminar esta publicación?");
      if (!confirmDelete) return;

      // optimista snapshot
      const previousPosts = posts;
      setPosts((prev) => prev.filter((p) => p.id !== postId));

      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });

        // intentar parsear JSON si hay (por si el backend devuelve error en JSON)
        let body: any = null;
        try {
          body = await res.json();
        } catch (e) {
          body = await res.text().catch(() => null);
        }

        if (!res.ok) {
          console.error("DELETE /api/posts/[id] responded with non-ok:", res.status, body);
          throw new Error(typeof body === "string" ? body : JSON.stringify(body || {}));
        }

        toast.success("✅ Publicación eliminada");
      } catch (error: any) {
        console.error("Error al eliminar (cliente):", error);
        // rollback
        setPosts(previousPosts);
        toast.error("❌ No se pudo eliminar la publicación — revisa consola/server logs.");
      }
    };

    // -------------------------
    // UI helpers
    // -------------------------
    const onOpenFollowers = () => router.push(`/profile/followers`); // si haces rutas
    const onOpenFollowing = () => router.push(`/profile/following`);

    return (
      <div className="min-h-screen font-sans px-4 text-black dark:text-white bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#05060a] dark:to-[#071018]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 py-8">
          {/* Left sidebar */}
          <aside className="hidden lg:block w-64 sticky top-6 self-start">
            {session?.user ? <ProfileSidebar /> : <div className="p-2" />}
          </aside>

          {/* Center */}
          <main className="flex-1 max-w-4xl w-full mx-auto">
            <div className="overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-[#0f1720]">
              {/* Cover */}
              <div
                className="h-56 relative"
                style={
                  coverImage
                    ? {
                        backgroundImage: `url(${coverImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {
                        background:
                          "linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(99,102,241,1) 50%, rgba(79,70,229,1) 100%)",
                      }
                }
              >
                <label className="absolute left-3 top-3 inline-flex items-center gap-2 bg-black/30 text-white px-3 py-1 rounded-full cursor-pointer hover:bg-black/40 transition">
                  📸 Subir cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, "cover");
                    }}
                  />
                </label>

                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute right-4 top-4 inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full border border-white/10 hover:scale-[.99] transition shadow-sm cursor-pointer"
                >
                  ✏️ Editar perfil
                </button>

                {/* Avatar */}
                <div className="absolute -bottom-16 left-6">
                  <label className="relative cursor-pointer group">
                    <div className="w-[110px] h-[110px] rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-[#0d1117] flex items-center justify-center overflow-hidden">
                        <img
                          src={image || "/default-avatar.png"}
                          alt="Avatar"
                          width={110}
                          height={110}
                          className="rounded-full border-4 border-[#0d1117] shadow-lg object-cover"
                        />
                      </div>
                    </div>

                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="text-sm text-white">📸 Cambiar</span>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, "avatar");
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Info usuario */}
              <div className="mt-20 px-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                      {name || "Sin nombre"}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      @{user.username || "sin-usuario"} ·{" "}
                      <span className="text-xs text-gray-400 dark:text-gray-500">{user.email || "sin-email"}</span>
                    </p>

                    {/* Biografía estilo twitter (flexible) */}
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl">
                      {bio?.split("\n").map((line, i) => (
                        <p key={i} className="m-0">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Location */}
                    {location && <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">📍 {location}</div>}
                  </div>

                  {/* Social counts */}
                  <div className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full shadow">
                        <div className="text-sm font-semibold">{followersCount.toLocaleString()}</div>
                        <div className="text-xs opacity-90">Seguidores</div>
                      </div>

                      <button
                        onClick={onOpenFollowers}
                        className="text-xs text-gray-500 hover:underline cursor-pointer"
                      >
                        Ver seguidores
                      </button>

                      <div className="inline-flex items-center gap-3 mt-2 bg-white/5 text-white px-3 py-1 rounded-full border border-gray-800">
                        <div className="text-sm font-semibold">{followingCount.toLocaleString()}</div>
                        <div className="text-xs opacity-90">Siguiendo</div>
                      </div>

                      <button
                        onClick={onOpenFollowing}
                        className="text-xs text-gray-500 hover:underline cursor-pointer " 
                      >
                        Ver siguiendo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4 border-t border-gray-200 dark:border-gray-800">
                <nav className="flex gap-6 px-6">
                  {(["posts", "media", "likes"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative pb-4 pt-3 text-sm font-medium transition-colors  ${
                        activeTab === tab
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white "
                      }`}
                    >
                      <span className="inline-block px-2">
                        {tab === "posts" && `📝 ${t("Posts")}`}
                        {tab === "media" && `📸 ${t("Media")}`}
                        {tab === "likes" && `♥️ ${t("Likes")}`}
                      </span>

                      <span
                        className={`absolute left-0 right-0 -bottom-0.5 mx-auto h-0.5 w-0 transition-all ${
                          activeTab === tab ? "w-10 bg-gradient-to-r from-purple-500 to-pink-500 " : "w-0"
                        }`}
                        aria-hidden
                      />
                    </button>
                  ))}
                </nav>
              </div>

              {/* Posts area */}
              <div className="px-6 py-6 space-y-6">
                <NewPostForm onPostCreated={fetchPosts} />

                {loadingPosts ? (
                  <p className="text-gray-500 dark:text-gray-400">Cargando publicaciones...</p>
                ) : filteredPosts().length === 0 ? (
                  <p className="text-gray-500 text-center">No hay publicaciones</p>
                ) : (
                  <AnimatePresence>
                    {filteredPosts().map((post) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
                        transition={{ duration: 0.25 }}
                        layout
                        className="bg-gradient-to-br from-white/60 to-gray-50 dark:from-[#0b1220] dark:to-[#0d1724] text-black dark:text-white rounded-2xl shadow-md p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={post.author?.image || "/default-avatar.png"}
                              alt="avatar"
                              width={44}
                              height={44}
                              className="rounded-full border-2 border-transparent object-cover"
                            />
                            <div>
                              <div className="font-semibold">{post.author?.name || "Anónimo"}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(post.createdAt), "dd MMM yyyy • HH:mm")}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-gray-400">{/* post menu */}</div>
                        </div>

                        <p className="text-base leading-relaxed mb-4">{post.content}</p>

                        {post.image?.trim() && (
                          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 mb-4">
                            <img
                              src={post.image}
                              alt="Imagen del post"
                              className="w-full object-cover max-h-[520px]"
                            />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-6">
                            <div className="relative inline-block">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handleLikeWithBurst(post.id)}
                                className="flex items-center gap-2 text-sm focus:outline-none"
                              >
                                <motion.div
                                  key={post.likes?.some((l) => l.userId === user.id) ? "liked" : "unliked"}
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                  <Heart
                                    size={20}
                                    fill={post.likes?.some((like) => like.userId === user.id) ? "#ec4899" : "transparent"}
                                    stroke={post.likes?.some((like) => like.userId === user.id) ? "#ec4899" : "currentColor"}
                                    className="cursor-pointer"
                                  />
                                </motion.div>
                                <span className="text-sm">{post.likes?.length || 0}</span>
                              </motion.button>

                              <AnimatePresence>
                                {burstHearts.map((h) => (
                                  <motion.span
                                    key={h.id}
                                    initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                                    animate={{
                                      opacity: 0,
                                      x: Math.cos((h.angle * Math.PI) / 180) * h.distance,
                                      y: Math.sin((h.angle * Math.PI) / 180) * h.distance,
                                      scale: 1.2,
                                    }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: "#ec4899", fontSize: 14 }}
                                  >
                                    ❤️
                                  </motion.span>
                                ))}
                              </AnimatePresence>
                            </div>

                            <button
                              onClick={() => {
                                navigator.share
                                  ? navigator.share({
                                      title: "Mira este post",
                                      text: post.content,
                                      url: `${window.location.origin}/post/${post.id}`,
                                    })
                                  : alert("Compartir no es compatible con tu navegador.");
                              }}
                              className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition cursor-pointer"
                            >
                              🔗 Compartir
                            </button>

                            <button
                              onClick={() => alert("Función de retweet próximamente")}
                              className="text-sm text-gray-600 dark:text-gray-300 hover:text-yellow-400 transition cursor-pointer"
                            >
                              🔁 Retweet
                            </button>
                          </div>

                          {post.author?.id === user.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // evita eventos parent (p. ej. abrir post)
                                handleDelete(post.id);
                              }}
                              className="text-sm text-red-500 hover:underline focus:outline-none cursor-pointer"
                              aria-label="Eliminar publicación"
                              title="Eliminar publicación"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>

                        {/* Comments */}
                        <div className="mt-4">
                          <button
                            onClick={() =>
                              setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                            }
                            className="text-sm text-blue-500 hover:underline"
                          >
                            {expandedComments?.[post.id] ? "Ocultar comentarios" : "Ver comentarios"}
                          </button>

                          {expandedComments?.[post.id] && (
                            <div className="mt-3">
                              <h4 className="text-sm text-blue-500 font-semibold">Comentarios</h4>
                              {post.comments?.length === 0 ? (
                                <p className="text-gray-400 text-sm">No hay comentarios aún.</p>
                              ) : (
                                post.comments.map((c) => (
                                  <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-2">
                                    <span className="font-semibold">{c.author?.name || "Anónimo"}:</span> {c.content}
                                  </div>
                                ))
                              )}
                              <NewCommentFormFull postId={post.id} onCommentAdded={updatePostLocally} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <Link href="/" className="block text-center text-purple-600 dark:text-purple-400 mt-8 hover:underline">
                  {t("Ir al inicio")}
                </Link>
              </div>
            </div>
          </main>

          {/* Right */}
          <aside className="hidden lg:block w-80">
            <div className="rounded-2xl p-6 bg-white/60 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-800 shadow-lg sticky top-6">
              <RightSidebar t={t} activeTag={undefined} />
            </div>
          </aside>
        </div>

        {/* Edit modal */}
        {isEditing && (
          <EditProfileModal
            initialData={{
              name: profileData.name,
              bio: profileData.bio || "",
              location: profileData.location || "",
              image: profileData.image,
              coverImage: profileData.coverImage,
            }}
            onClose={() => setIsEditing(false)}
            onSave={handleProfileSaved}
          />
        )}
      </div>
    );
  }
