// components/SearchResults.tsx
"use client";

import Link from "next/link";
import React from "react";

type UserItem = {
  id?: string;
  username?: string;
  name?: string;
  image?: string | null;
  bio?: string | null;
  _type?: "user";
};

type PostItem = {
  id: string;
  content: string;
  image?: string | null;
  createdAt?: string | Date;
  author?: { username?: string; name?: string | null; image?: string | null };
  hashtags?: string[];
  likesCount?: number;
  commentsCount?: number;
  _type?: "post";
};

export default function SearchResults({ results = [] as (UserItem | PostItem)[] }) {
  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="py-16">
        <p className="text-center text-gray-400">No se encontraron resultados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((r: any, idx: number) => {
        // heurística para detectar usuario vs post
        const isUser = !!(r.username || r.email) && !r.content;
        const isPost = !!(r.content || r.author || r.image);

        if (isUser) {
          const user = r as UserItem;
          return <UserCard key={user.id ?? user.username ?? idx} user={user} />;
        }

        if (isPost) {
          const post = r as PostItem;
          return <PostCard key={post.id ?? idx} post={post} />;
        }

        // fallback: render JSON
        return (
          <pre
            key={idx}
            className="p-3 rounded-md bg-gray-900 border border-gray-800 text-xs text-gray-300 overflow-auto"
          >
            {JSON.stringify(r, null, 2)}
          </pre>
        );
      })}
    </div>
  );
}

/* ----------------- Small presentational components ----------------- */

function formatDate(value?: string | Date) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function UserCard({ user }: { user: UserItem }) {
  return (
    <div className="flex items-center gap-4 bg-gradient-to-b from-[#071014] to-[#071017] border border-gray-800 rounded-2xl p-4">
      <Link href={`/user/${encodeURIComponent(user.username ?? "")}`} className="shrink-0">
        <img
          src={user.image ?? "/default-avatar.png"}
          alt={user.name ?? user.username}
          className="w-14 h-14 rounded-full object-cover border border-gray-700"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate">
            <Link href={`/user/${encodeURIComponent(user.username ?? "")}`} className="font-semibold hover:underline block truncate">
              {user.name ?? user.username}
            </Link>
            <div className="text-xs text-gray-400">@{user.username}</div>
          </div>

          <div>
            <button
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm transition"
              aria-label={`Seguir a ${user.username}`}
            >
              Seguir
            </button>
          </div>
        </div>

        {user.bio && <p className="mt-2 text-sm text-gray-300 line-clamp-2">{user.bio}</p>}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: PostItem }) {
  const author = post.author ?? { username: "desconocido", name: undefined, image: undefined };

  return (
    <article className="bg-gradient-to-b from-[#071018] to-[#07101a] border border-gray-800 rounded-2xl p-4">
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
              <Link href={`/user/${encodeURIComponent(author.username ?? "")}`} className="font-semibold hover:underline block truncate">
                {author.name ?? author.username}
              </Link>
              <div className="text-xs text-gray-400">@{author.username} · <span className="text-gray-500">{formatDate(post.createdAt)}</span></div>
            </div>
          </div>

          <p className="mt-3 text-gray-200 whitespace-pre-line break-words">{post.content}</p>

          {post.image && (
            <div className="mt-3">
              <img
                src={post.image}
                alt="post image"
                className="w-full max-h-[420px] object-cover rounded-lg border border-gray-800"
                onError={(e) => {
                  // si la imagen falla, escondemos el elemento para no romper layout
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-3 flex-wrap">
              {(post.hashtags ?? []).slice(0, 6).map((h) => (
                <Link
                  key={h}
                  href={`/hashtag/${encodeURIComponent(h.replace(/^#/, ""))}`}
                  className="text-xs px-2 py-1 rounded-md bg-gray-900/30 border border-gray-800 hover:bg-gray-900/60 transition"
                >
                  #{h.replace(/^#/, "")}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-200">{post.likesCount ?? 0}</span>
                <span>❤️</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-200">{post.commentsCount ?? 0}</span>
                <span>💬</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
