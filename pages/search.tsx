// pages/search.tsx
import React, { useState } from "react";
import Link from "next/link";
import RightSidebar from "@/components/RightSidebar"; // ajusta ruta si es necesario

type UserResult = {
  id: string;
  username: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  followers?: number;
  type: "user";
};

type PostResult = {
  id: string;
  content: string;
  createdAt?: string | null;
  author?: { username?: string; name?: string | null; image?: string | null } | null;
  images?: string[];
  type: "post";
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<UserResult | PostResult>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const json = await res.json();
      setResults(Array.isArray(json) ? json : []);
    } catch (err: any) {
      console.error("Error search:", err);
      setError(err?.message ?? "Error desconocido al buscar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="py-8 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <main className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
              Buscar
            </h1>
            <p className="text-sm text-gray-400 mt-1">Busca usuarios, #hashtags o texto en publicaciones</p>
          </div>

          <form onSubmit={handleSearch} className="mb-6 max-w-3xl">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en NUBO (usuarios, #hashtag, texto...)"
                className="w-full pl-4 pr-28 py-3 rounded-full bg-gradient-to-b from-[#071018] to-[#07101a] border border-gray-800 text-white placeholder-gray-500 focus:outline-none"
                aria-label="Buscar"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 rounded-full text-sm font-medium shadow hover:opacity-95 transition"
                aria-label="Buscar"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-4 rounded-lg p-3 bg-red-900/20 border border-red-800 text-red-300">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && results.length === 0 && query.trim() === "" && (
            <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-400">Escribe algo para buscar.</div>
          )}

          {loading && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loading && results.length === 0 && query.trim() !== "" && !error && (
            <div className="rounded-lg border border-gray-800 p-6 bg-gradient-to-b from-[#0b0710] to-[#07101a] text-center text-gray-400">
              No se encontraron resultados para «{query}».
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((r) =>
                (r as any).type === "user" ? (
                  <UserCard key={(r as UserResult).id} user={r as UserResult} />
                ) : (
                  <PostCard key={(r as PostResult).id} post={r as PostResult} />
                )
              )}
            </div>
          )}
        </main>

        {/* Right */}
        <aside className="hidden lg:block">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function extractHashtags(text?: string, max = 3) {
  if (!text) return [];
  const regex = /#([^\s#.,!?;:()[\]{}"“”'`<>]+)/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null && set.size < max) {
    const tag = String(m[1] || "").replace(/^#/, "").trim();
    if (tag) set.add(tag);
  }
  return Array.from(set);
}

/* ----------------- Presentational components ----------------- */

function UserCard({ user }: { user: UserResult }) {
  return (
    <div className="flex items-center gap-4 bg-gradient-to-b from-[#0f0716] to-[#081018] border border-gray-800 rounded-2xl p-4">
      <Link href={`/user/${encodeURIComponent(user.username)}`} className="shrink-0">
        <img
          src={user.image ?? "/default-avatar.png"}
          alt={user.name ?? user.username}
          className="w-14 h-14 rounded-full object-cover border border-gray-700"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate">
            <Link
              href={`/user/${encodeURIComponent(user.username)}`}
              className="font-semibold hover:underline block truncate"
            >
              {user.name ?? user.username}
            </Link>
            <div className="text-xs text-gray-400">@{user.username}</div>
          </div>
          <div>
            <button className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm">
              Seguir
            </button>
          </div>
        </div>

        {user.bio && <p className="mt-2 text-sm text-gray-300 line-clamp-2">{user.bio}</p>}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: PostResult }) {
  const author = post.author ?? { username: "desconocido", name: undefined, image: undefined };

  // obtener hashtags desde content y limitar a 3; si no hay content try empty array
  const tagsFromContent = extractHashtags(post.content, 3);

  // si el API tiene un campo 'images' pero no hashtags, mostrado imagenes ya se hace arriba
  // mostramos hasta 3 hashtags extraídos (si existen)
  const hashtags = tagsFromContent;

  return (
    <article className="bg-gradient-to-b from-[#0f0716] to-[#081018] border border-gray-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <Link href={`/user/${encodeURIComponent(author.username ?? "")}`} className="shrink-0">
          <img
            src={author.image ?? "/default-avatar.png"}
            alt={author.name ?? author.username}
            className="w-12 h-12 rounded-full object-cover border border-gray-700"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="truncate">
              <Link
                href={`/user/${encodeURIComponent(author.username ?? "")}`}
                className="font-semibold hover:underline block truncate"
              >
                {author.name ?? author.username}
              </Link>
              <div className="text-xs text-gray-400">
                @{author.username} ·{" "}
                <span className="text-gray-500">{post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-gray-200 whitespace-pre-line break-words text-sm">{post.content}</p>

          {post.images && post.images.length > 0 && (
            <div className="mt-3">
              <img
                src={post.images[0]}
                alt="post image"
                className="w-full max-h-[420px] object-cover rounded-lg border border-gray-800"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
            <div className="flex flex-wrap gap-2 items-center">
              {hashtags.length > 0 ? (
                hashtags.map((h) => (
                  <Link
                    key={h}
                    href={`/hashtag/${encodeURIComponent(h)}`}
                    className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-purple-800/30 to-indigo-900/30 border border-gray-800 hover:from-purple-700 hover:to-indigo-700 transition inline-block"
                  >
                    #{h}
                  </Link>
                ))
              ) : (
                <span className="text-xs text-gray-500">— sin hashtags —</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-200">0</span> ❤️
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-200">0</span> 💬
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gradient-to-b from-[#0f0716] to-[#081018] border border-gray-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-800" />
        <div className="flex-1">
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-800 rounded w-full mb-2" />
          <div className="h-3 bg-gray-800 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
}
