"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  user: {
    id: string;
    name: string;
    username: string;
    image: string;
  };
}

export default function UserSidebarCard({ user }: Props) {
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadCounts() {
      try {
        const res = await fetch(`/api/user/followersCount?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setFollowers(data.followersCount);
          setFollowing(data.followingCount);
        }
      } catch (err) {
        console.error("Error cargando followersCount:", err);
      }
    }
    if (user.id) loadCounts();
  }, [user.id]);

  const handleClick = () => {
    // startTransition marcará la navegación como "pendiente" y isPending será true
    startTransition(() => {
      // usa la ruta real que necesites; aquí uso /profile
      router.push("/profile");
    });
  };

  return (
    <div className="rounded-2xl shadow-xl p-6 text-center border transition-all duration-300 
                    bg-white border-gray-200 text-gray-900 hover:shadow-2xl
                    dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 
                    dark:border-gray-700 dark:text-white">
      <div className="flex justify-center relative">
        <Image
          src={user.image || "/default-avatar.png"}
          alt={user.name}
          width={90}
          height={90}
          className="rounded-full border-4 border-purple-500 shadow-md"
        />
      </div>

      <div className="mt-4">
        <h2 className="font-bold text-lg">{user.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">@{user.username}</p>
      </div>

      <div className="flex justify-around mt-6 text-sm">
        <div>
          <span className="block text-lg font-extrabold text-purple-600 dark:text-purple-400">
            {followers === null ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              followers
            )}
          </span>
          <p className="text-gray-500 dark:text-gray-400">Seguidores</p>
        </div>
        <div>
          <span className="block text-lg font-extrabold text-purple-600 dark:text-purple-400">
            {following === null ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              following
            )}
          </span>
          <p className="text-gray-500 dark:text-gray-400">Siguiendo</p>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-busy={isPending}
          className={`px-4 py-2 w-full rounded-xl font-semibold transition-colors shadow-md 
            cursor-pointer flex justify-center items-center
            ${isPending
              ? "bg-purple-400 text-white cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600"
            }`}
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Cargando...
            </>
          ) : (
            "Ver perfil"
          )}
        </button>
      </div>
    </div>
  );
}
