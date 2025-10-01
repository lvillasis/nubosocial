// pages/profile/following.tsx
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import RightSidebar from "@/components/RightSidebar";
import ProfileSidebar from "@/pages/components/ProfileSidebar";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

const PAGE_SIZE = 12;

type SimpleUser = { id: string; name?: string | null; username: string; image?: string | null; bio?: string | null };

type Props = {
  profileUser: { id: string; username: string; name?: string | null; image?: string | null; coverImage?: string | null; bio?: string | null } | null;
  users: SimpleUser[];
  total: number;
  page: number;
  totalPages: number;
  currentUserId: string | null;
  initiallyFollowedIds: string[]; // which of listed users are followed by currentUser
};

export default function FollowingPage({ profileUser, users, total, page, totalPages, currentUserId, initiallyFollowedIds }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const [followMap, setFollowMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initiallyFollowedIds.map((id) => [id, true]))
  );
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [list, setList] = useState<SimpleUser[]>(users);
  const [curPage, setCurPage] = useState<number>(page);

  useEffect(() => {
    setList(users);
    setCurPage(page);
    setFollowMap(Object.fromEntries(initiallyFollowedIds.map((id) => [id, true])));
  }, [users, page, initiallyFollowedIds.join(",")]);

  const fetchPage = async (p: number) => {
    try {
      const target = profileUser?.username ? `&user=${encodeURIComponent(profileUser.username)}` : "";
      const res = await fetch(`/api/user/following?page=${p}&perPage=${PAGE_SIZE}${target}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setList(json.following ?? []);
      setCurPage(json.page ?? p);
    } catch (_err) {
      console.error("Error cargando following:", err);
    }
  };

  const onToggleFollow = async (targetId: string) => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    const currently = !!followMap[targetId];
    setFollowMap((m) => ({ ...m, [targetId]: !currently }));
    setLoadingMap((m) => ({ ...m, [targetId]: true }));

    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error");
      setFollowMap((m) => ({ ...m, [targetId]: Boolean(json.followed) }));
    } catch (_err) {
      console.error("Follow error:", err);
      setFollowMap((m) => ({ ...m, [targetId]: currently }));
      alert("No se pudo actualizar el seguimiento. Intenta de nuevo.");
    } finally {
      setLoadingMap((m) => ({ ...m, [targetId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#05060a] dark:to-[#071018] text-black dark:text-white px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 py-8">
        <aside className="hidden lg:block w-64 sticky top-6 self-start">
          {session?.user ? (
            <ProfileSidebar
              user={{
                id: (session.user as any).id || "",
                name: (session.user as any).name || "",
                username: (session.user as any).username || "",
                image: (session.user as any).image || "/default-avatar.png",
              }}
            />
          ) : (
            <div className="p-2" />
          )}
        </aside>

        <main className="flex-1 max-w-4xl w-full mx-auto">
          <div className="overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-[#0f1720]">
            <div className="relative">
              <div
                className="h-44 rounded-t-2xl bg-cover bg-center"
                style={{
                  backgroundImage: `url(${profileUser?.coverImage ?? "/default-cover.png"})`,
                }}
              />
              <div className="px-6 pb-6 pt-4">
                <div className="flex items-start gap-4">
                  <div className="mt-[-48px]">
                    <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-[#0d1117] overflow-hidden">
                        <Image src={profileUser?.image ?? "/default-avatar.png"} alt={profileUser?.name ?? profileUser?.username} width={96} height={96} className="object-cover rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold leading-tight truncate">{profileUser?.name ?? "Usuario"}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{profileUser?.username}</p>
                    {profileUser?.bio && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{profileUser.bio}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <h3 className="text-lg font-semibold mb-4">Siguiendo ({total})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-transparent shadow-sm">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      <Image src={u.image ?? "/default-avatar.png"} alt={u.name ?? u.username} width={56} height={56} className="object-cover rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.name ?? "Sin nombre"}</div>
                          <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                        </div>

                        <div className="ml-2 flex-shrink-0">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggleFollow(u.id)}
                            disabled={loadingMap[u.id] || currentUserId === u.id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition
                              ${followMap[u.id] ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white" : "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200"}
                              ${loadingMap[u.id] ? "opacity-70 cursor-wait" : "hover:brightness-110"}`}
                          >
                            {loadingMap[u.id] ? "…" : followMap[u.id] ? "Siguiendo" : "Seguir"}
                          </motion.button>
                        </div>
                      </div>

                      {u.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{u.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">Página {curPage} de {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button disabled={curPage <= 1} onClick={() => fetchPage(curPage - 1)} className={`px-3 py-1 rounded-md border ${curPage <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-gray-100"}`}>Anterior</button>
                  <button disabled={curPage >= totalPages} onClick={() => fetchPage(curPage + 1)} className={`px-3 py-1 rounded-md border ${curPage >= totalPages ? "opacity-50 pointer-events-none" : "bg-gradient-to-r from-purple-600 to-pink-500 text-white"}`}>Siguiente</button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden lg:block w-80">
          <div className="rounded-2xl p-6 bg-white/60 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-800 shadow-lg sticky top-6">
            <RightSidebar t={(s:string)=>s} activeTag={profileUser?.username} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** SSR */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const page = Math.max(1, Number(ctx.query.page || 1));
  const limit = PAGE_SIZE;
  const offset = (page - 1) * limit;

  let targetUsername = (ctx.query.user as string) || "";
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  let currentUserId: string | null = null;
  if (session?.user) {
    currentUserId = (session.user as any).id ?? null;
    if (!currentUserId && session.user.email) {
      const uu = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      currentUserId = uu?.id ?? null;
    }
  }

  if (!targetUsername && session?.user) {
    targetUsername = (session.user as any).username ?? "";
  }

  const profileUser = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true, username: true, name: true, image: true, coverImage: true, bio: true },
  });

  if (!profileUser) return { notFound: true };

  // following: userLike where likedById = profileUser.id -> userId are whom they follow
  const [total, rows] = await Promise.all([
    prisma.userLike.count({ where: { likedById: profileUser.id } }),
    prisma.userLike.findMany({
      where: { likedById: profileUser.id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: { userId: true },
    }),
  ]);

  const ids = rows.map((r) => r.userId);

  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, username: true, image: true, bio: true },
      })
    : [];

  // who among these users is currently followed by currentUser?
  const initiallyFollowedIds: string[] = [];
  if (currentUserId && users.length) {
    const rels = await prisma.userLike.findMany({
      where: { likedById: currentUserId, userId: { in: users.map((u) => u.id) } },
      select: { userId: true },
    });
    rels.forEach((r) => initiallyFollowedIds.push(r.userId));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    props: {
      profileUser,
      users,
      total,
      page,
      totalPages,
      currentUserId,
      initiallyFollowedIds,
    },
  };
};
