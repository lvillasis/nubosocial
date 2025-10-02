// components/Navbar.tsx
import Link from "next/link";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/LogoLogin";
import { useState, useRef, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const { data: session, status } = useSession();
  const { t } = useTranslation("common");
  const router = useRouter();

  const changeLanguage = (lng: string) => {
    router.push(router.pathname, router.asPath, { locale: lng });
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // logout handler (revoca refresh tokens + signOut)
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await signOut({ callbackUrl: "/login" });
    } catch (_err) {
      console.error("Error cerrando sesión:", _err);
    }
  };

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  return (
    <nav className="backdrop-blur-sm bg-white/80 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* LEFT: logo + brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Inicio">
            <div className="rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-1.5">
              <Logo className="w-10 h-10" variant="stacked" hideText />
            </div>
            <span className="hidden sm:inline-block text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400">
              NuboSocial
            </span>
          </Link>
        </div>

        {/* CENTER: links (ocultos en móvil) */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-200">
          <Link href="/" className="hover:text-indigo-400 dark:hover:text-indigo-300 transition">
            {t("home", "Inicio")}
          </Link>
          <Link href="/profile" className="hover:text-indigo-400 dark:hover:text-indigo-300 transition">
            {t("profile", "Perfil")}
          </Link>
          <Link href="/news" className="hover:text-indigo-400 dark:hover:text-indigo-300 transition">
            {t("news", "Noticias")}
          </Link>
        </div>

        {/* RIGHT: theme, idiomas, sesión */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => changeLanguage("es")}
              aria-label="Cambiar a Español"
              className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              🇪🇸
            </button>
            <button
              onClick={() => changeLanguage("en")}
              aria-label="Cambiar a Inglés"
              className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              🇺🇸
            </button>
          </div>

          {/* mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-md text-gray-600 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
            onClick={() => setMobileOpen((s) => !s)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>

          {/* Sesión / avatar */}
          {status === "loading" ? (
            <p className="text-gray-500 text-sm hidden sm:block">Cargando...</p>
          ) : session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((s) => !s)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition "
              >
                <span className="hidden sm:block text-sm text-gray-800 dark:text-white font-medium cursor-pointer">
                  {session.user.name}
                </span>
                <Image
                  src={session.user.image || "/default-avatar.png"}
                  alt={session.user.name || "avatar"}
                  width={36}
                  height={36}
                  className="rounded-full ring-2 ring-indigo-500 cursor-pointer"
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#0b0d11] border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1 z-40 ">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    {t("profile", "Perfil")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    {t("signout", "Salir")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-indigo-500 font-medium hover:underline hidden sm:inline-block"
            >
              {t("signin", "Iniciar sesión")}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-white/90 dark:bg-[#0b0d11] border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("home", "Inicio")}
            </Link>
            <Link
              href="/profile"
              className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("profile", "Perfil")}
            </Link>
            <Link
              href="/news"
              className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("news", "Noticias")}
            </Link>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              <button
                onClick={() => changeLanguage("es")}
                className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                🇪🇸 ESP
              </button>
              <button
                onClick={() => changeLanguage("en")}
                className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                🇺🇸 ENG
              </button>
            </div>

            <div className="pt-3">
              {session?.user ? (
                <>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {t("profile", "Perfil")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {t("signout", "Salir")}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  {t("signin", "Iniciar sesión")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
