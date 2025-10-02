// components/NavbarDark.tsx
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";

export default function NavbarDark() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation("common");

  const changeLanguage = (lng: string) => {
    router.push(router.pathname, router.asPath, { locale: lng });
  };

  return (
    <nav className="bg-[#0d1117] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo + Navegación */}
        <div className="flex items-center gap-6 text-sm font-semibold text-white">
          <Link href="/" className="text-xl font-extrabold text-blue-500 hover:text-blue-400 transition">NUBO</Link>
          <Link href="/" className="hover:text-blue-400 transition">{t("home", "Inicio")}</Link>
          <Link href="/profile" className="hover:text-blue-400 transition">{t("profile", "Perfil")}</Link>
          <Link href="/news" className="hover:text-blue-400 transition">{t("news", "Noticias")}</Link>
        </div>

        {/* Controles del usuario + idiomas */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-lg">
            <button onClick={() => changeLanguage("es")} className="hover:scale-110 transition">🇪🇸</button>
            <button onClick={() => changeLanguage("en")} className="hover:scale-110 transition">🇺🇸</button>
          </div>

          {status === "loading" ? (
            <p className="text-gray-400 text-sm">Cargando...</p>
          ) : session?.user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-200 font-medium hidden sm:block">
                {session.user.name}
              </span>
              <Image
                src={session.user.image || "/default-avatar.png"}
                alt="avatar"
                width={36}
                height={36}
                className="rounded-full border"
              />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full transition"
              >
                {t("signout")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-blue-500 font-medium hover:underline text-sm"
            >
              {t("signin")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
