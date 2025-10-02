// pages/user/[username].tsx
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import RightSidebar from "@/components/RightSidebar";
import ProfileSidebar from "@/pages/components/ProfileSidebar";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { motion } from "framer-motion";

// carga cliente-only para evitar referencias a window en SSR
const UserPosts = dynamic(() => import("@/components/UserPosts"), { ssr: false });

type PublicUser = {
  id: string;
  name?: string | null;
  username: string;
  email?: string | null;
  image?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  location?: string | null;
};

type Props = {
  user: PublicUser | null;
  isFollowingInitial: boolean;
  followersCountInitial: number;
  followingCountInitial: number;
  currentUserId: string | null;
};

export default function PublicProfile({
  user,
  isFollowingInitial,
  followersCountInitial,
  followingCountInitial,
  currentUserId,
}: Props) {
  const { t } = useTranslation("common");
  const { data: session } = useSession();
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState<boolean>(Boolean(isFollowingInitial));
  const [followersCount, setFollowersCount] = useState<number>(followersCountInitial ?? 0);
  const [followingCount, setFollowingCount] = useState<number>(followingCountInitial ?? 0);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const [startingConversation, setStartingConversation] = useState(false);

  if (!user) return <div className="p-6">Usuario no encontrado</div>;

  // snippet: onToggleFollow (optimistic)
  const onToggleFollow = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    const prevFollowing = isFollowing;
    const prevFollowersCount = followersCount;

    // optimistic UI
    setIsFollowing(!prevFollowing);
    setFollowersCount(prevFollowing ? Math.max(0, prevFollowersCount - 1) : prevFollowersCount + 1);
    setLoadingFollow(true);

    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: user.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Follow API error:", json);
        // rollback
        setIsFollowing(prevFollowing);
        setFollowersCount(prevFollowersCount);
        // user-friendly message
        alert(json?.error || "No se pudo actualizar el seguimiento. Intenta de nuevo.");
        return;
      }

      // success: set state according to server truth
      setIsFollowing(Boolean(json.followed));
      if (typeof json.followersCount === "number") setFollowersCount(Number(json.followersCount));
    } catch (_err) {
      console.error("Follow client error:", _err);
      // rollback
      setIsFollowing(prevFollowing);
      setFollowersCount(prevFollowersCount);
      alert("No se pudo actualizar el seguimiento. Intenta de nuevo.");
    } finally {
      setLoadingFollow(false);
    }
  };



  // polling ligero (counts + isFollowing)
  useEffect(() => {
    const userId = user?.id ?? "";
    if (!userId) return;
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const countsRes = await fetch(`/api/user/followCounts?userId=${encodeURIComponent(userId)}`);
        if (countsRes.ok) {
          const { followersCount: fC, followingCount: gC } = await countsRes.json();
          if (mounted && typeof fC === "number") setFollowersCount(fC);
          if (mounted && typeof gC === "number") setFollowingCount(gC);
        }
        if (currentUserId) {
          const isFRes = await fetch(`/api/user/isFollowing?targetId=${encodeURIComponent(userId)}`);
          if (isFRes.ok) {
            const { followed } = await isFRes.json();
            if (mounted && typeof followed === "boolean") setIsFollowing(Boolean(followed));
          }
        }
      } catch (e) {
        console.debug("follow polling error:", e);
      }
    };

    tick();
    timer = setInterval(tick, 12000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [user?.id, currentUserId]);

  return (
    <div className="min-h-screen font-sans px-4 text-black dark:text-white bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#05060a] dark:to-[#071018]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 py-8">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-64 sticky top-6 self-start">
          {session?.user ? <ProfileSidebar /> : <div className="p-2" />}
        </aside>

        {/* Center */}
        <main className="flex-1 max-w-4xl w-full mx-auto ">
          <div className="overflow-visible rounded-2xl shadow-2xl bg-white dark:bg-[#0f1720]">
            {/* COVER - outer container has overflow-visible so avatar isn't recortado */}
            <div className="relative">
              <div
                className="h-56 rounded-t-2xl overflow-hidden"
                style={
                  user.coverImage
                    ? {
                        backgroundImage: `url(${user.coverImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {
                        background:
                          "linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(99,102,241,1) 50%, rgba(79,70,229,1) 100%)",
                      }
                }
              />
              {/* avatar (solapado, con z-index y translate para posicionarlo sin recorte) */}
              <div className="absolute left-6" style={{ bottom: -6 }}>
                <div className="transform translate-y-1/2 z-30">
                  <div className="w-[110px] h-[110px] rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#0d1117] flex items-center justify-center overflow-hidden">
                      <Image
                        src={user.image ?? "/default-avatar.png"}
                        alt={user.name ?? user.username}
                        width={110}
                        height={110}
                        className="rounded-full border-4 border-[#0d1117] object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info usuario */}
            <div className="mt-20 px-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold leading-tight truncate">{user.name || "Sin nombre"}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                  {user.email && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{user.email}</p>}
                </div>

                <button
                  onClick={async () => {
                    if (!currentUserId) {
                      router.push("/login");
                      return;
                    }

                    setStartingConversation(true);
                    try {
                      const res = await fetch("/api/messages/start", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetId: user.id })
                      });

                      const json = await res.json();
                      if (!res.ok) {
                        console.error("Start conversation error:", json);
                        alert(json?.error || "No se pudo iniciar la conversación");
                        setStartingConversation(false);
                        return;
                      }

                      if (json.conversationId) {
                        router.push(`/messages/${json.conversationId}`);
                      } else {
                        alert("Respuesta inesperada del servidor");
                      }
                    } catch (e) {
                      console.error("Network error starting conversation:", e);
                      alert("Error de red — revisa la consola del navegador o el servidor.");
                    } finally {
                      setStartingConversation(false);
                    }
                  }}
                  disabled={startingConversation}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-gray-700 text-sm hover:bg-white/5 cursor-pointer disabled:opacity-60"
                >
                  {startingConversation ? "Abriendo…" : "Mensajes"}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-8 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Seguidores</span>
                  <span className="font-semibold">{followersCount}</span>
                  <Link href={`/profile/followers?user=${encodeURIComponent(user.username)}`}>
                    <span className="text-xs text-indigo-400 hover:underline cursor-pointer">Ver seguidores</span>
                  </Link>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Siguiendo</span>
                  <span className="font-semibold">{followingCount}</span>
                  <Link href={`/profile/following?user=${encodeURIComponent(user.username)}`}>
                    <span className="text-xs text-indigo-400 hover:underline cursor-pointer">Ver siguiendo</span>
                  </Link>
                </div>
              </div>

              {user.bio && (
                <div className="mt-4 rounded-lg p-4 bg-gradient-to-r from-purple-50/8 to-indigo-50/6 border border-gray-800">
                  <p className="text-sm text-gray-200">{user.bio}</p>
                </div>
              )}
              {user.location && <div className="mt-2 text-xs text-gray-400">📍 {user.location}</div>}

              {/* Botón seguir (debajo de la bio, ya no está sobre la cover) */}
              <div className="mt-4">
                <motion.button
                  onClick={onToggleFollow}
                  disabled={loadingFollow || currentUserId === user.id}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: currentUserId === user.id ? 1 : 1.02 }}
                  animate={isFollowing ? { scale: [1, 1.03, 1] } : undefined}
                  transition={{ duration: 0.22 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm transition cursor-pointer
                    ${currentUserId === user.id ? "opacity-60 cursor-not-allowed bg-white/5 text-gray-300 border border-gray-700" : ""}
                    ${!isFollowing && currentUserId !== user.id ? "bg-gradient-to-r from-white/5 to-white/3 text-white border border-white/10 hover:brightness-105" : ""}
                    ${isFollowing ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent" : ""}`}
                >
                  {loadingFollow ? "…" : isFollowing ? "Siguiendo" : "Seguir"}
                </motion.button>
              </div>
            </div>

            {/* Posts (cliente-only) */}
            <section className="px-6 pb-6">
              <UserPosts userId={user.id} />
            </section>
          </div>
        </main>

        {/* Right */}
        <aside className="hidden lg:block w-80">
          <div className="rounded-2xl p-6 bg-white/60 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-800 shadow-lg sticky top-6">
            <RightSidebar t={t} activeTag={user.username} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** SSR */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = (ctx.params?.username as string) || "";

  const usr = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      coverImage: true,
      bio: true,
      location: true,
    },
  });

  if (!usr) return { notFound: true };

  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  let currentUserId: string | null = null;
  if (session?.user) {
    currentUserId = (session.user as any).id ?? null;
    if (!currentUserId && session.user.email) {
      const u = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      currentUserId = u?.id ?? null;
    }
  }

  const [followersCount, followingCount] = await Promise.all([
    prisma.userLike.count({ where: { userId: usr.id } }),
    prisma.userLike.count({ where: { likedById: usr.id } }),
  ]);

  let isFollowing = false;
  if (currentUserId && currentUserId !== usr.id) {
    const found = await prisma.userLike.findFirst({
      where: { userId: usr.id, likedById: currentUserId },
      select: { id: true },
    });
    isFollowing = Boolean(found);
  }

  return {
    props: {
      ...(await serverSideTranslations(ctx.locale || "es", ["common"])),
      user: usr,
      isFollowingInitial: isFollowing,
      followersCountInitial: followersCount,
      followingCountInitial: followingCount,
      currentUserId,
    },
  };
};
