// components/ProfileSidebar.tsx
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";

function AdSpace() {
  return (
    <div className="mt-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl p-4 text-center text-sm shadow-md">
      📰 Espacio publicitario
      <p className="text-xs mt-1 opacity-80">Tu anuncio aquí</p>
    </div>
  );
}

export default function ProfileSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [openSettings, setOpenSettings] = useState(false);

  const username = (session?.user as any)?.username || "usuario";
  const isProfilePage = router.asPath === `/profile/${username}`;

  const menu = [
    { name: "Inicio", href: "/", icon: HomeIcon },
    { name: "Buscar", href: "/search", icon: SearchIcon },
    { name: "Notificaciones", href: "/notifications", icon: BellIcon },
    { name: "Mensajes", href: "/messages", icon: ChatIcon },
    //{ name: "Perfil", href: `/profile/${username}`, icon: UserIcon },
  ];

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-screen border-r border-gray-200 dark:border-gray-700 p-4">
        <div>
          <nav className="flex flex-col gap-2">
            {menu.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 p-2 rounded-lg transition ${
                  router.asPath === item.href
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span>{item.name}</span>
              </Link>
            ))}

            {/* Configuración abre modal */}
            <button
              onClick={() => router.push("/settings")}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <SettingsIcon className="w-6 h-6" />
              <span>Configuración</span>
            </button>
          </nav>

          <AdSpace />
        </div>

        {/* Usuario abajo */}
        <div
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
            isProfilePage
              ? "bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => router.push(`/profile/${username}`)}
        >
          <img
            src={session?.user?.image || "/default-avatar.png"}
            alt="Avatar"
            className="w-12 h-12 rounded-full border border-gray-300 dark:border-gray-600"
          />
          <div>
            <p className="font-semibold">{session?.user?.name || "Usuario"}</p>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>
        </div>
      </aside>
    </>
  );
}

// --- ICONS ---
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3c0 .5-.2 1-.6 1.4L4 17h5" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a7.5 7.5 0 0 1 13 0" /> 
    </svg>
  );
}
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c0 .67.39 1.28 1 1.51.43.18.92.18 1.34 0" />
    </svg>
  );
}
