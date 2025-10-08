// pages/login.tsx  (o donde tengas tu LoginPage)
import { useState, useEffect, useRef, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { GetServerSidePropsContext } from "next";
import Logo from "@/components/LogoLogin";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(context.locale || "es", ["common"])),
    },
  };
}

export default function LoginPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: session, status } = useSession({ required: false });

  // estados
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // nuevo estado para "Recordarme"
  const [rememberMe, setRememberMe] = useState(false);

  // savedEmail: será null hasta que haya '@' en `email`
  const savedEmail: string | null = email.includes("@") ? email : null;

  // posiciones (para botón escapista)
  const POSITIONS = ["-translate-x-3", "-translate-y-20", "translate-x-[30px]", "translate-y-20", "-translate-x-[-30px]"] as const;
  const [posIndex, setPosIndex] = useState(0);

  // mensajes y animaciones
  const [msg, setMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const timersRef = useRef<number[]>([]);

  // efecto limpiar timers al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const callback = router.query.callbackUrl as string;
      if (!router.asPath.includes("/profile")) {
        router.replace(callback || "/profile");
      }
    }
  }, [status, router]);

  // Mensaje temporal
  const showMsg = useCallback(
    (text = t("Rellena usuario y contraseña")) => {
      setMsg(text);
      const id = window.setTimeout(() => setMsg(""), 2000);
      timersRef.current.push(id);
    },
    [t]
  );

  // cicla posiciones
  const shiftButton = useCallback(() => {
    setPosIndex((p) => (p + 1) % POSITIONS.length);
  }, [POSITIONS]);

  // animación extra
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    const id = window.setTimeout(() => setIsShaking(false), 420);
    timersRef.current.push(id);
  }, []);

  // -------------------------------------------------------
  // handleSubmit: signIn (NextAuth) + crear refresh token server-side
  // -------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = formRef.current;

    if (!form || !form.checkValidity() || savedEmail === null) {
      shiftButton();
      showMsg(t("Introduce un correo válido con @"));
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      // 1) Sign in con NextAuth (genera la sesión normal)
      const res = await signIn("credentials", {
        redirect: false,
        email: savedEmail,
        password,
        remember: rememberMe,
        callbackUrl: "/profile",
      } as any);

      // signIn devuelve un objeto o url dependiendo de la versión
      if (!res || (((res as any).error || !(res as any).ok) && !(res as any).url)) {
        const err = (res as any)?.error || t("Error al iniciar sesión");
        showMsg(err);
        setSubmitting(false);
        return;
      }

      // 2) Pedir al servidor (usando la sesión recién creada) que cree el refresh token y la cookie
      // Endpoint server-side: /api/auth/refresh/create (debe existir)
      try {
        await fetch("/api/auth/refresh/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remember: rememberMe }),
          credentials: "include",
        });
      } catch (_err) {
        // no bloqueamos la navegación por esto pero lo logueamos
        console.warn("No se pudo crear refresh token:", _err);
      }

      // 3) Redirigir al profile (usa la url devuelta por signIn si existe)
      const redirectTo = (res as any)?.url || "/profile";
      router.push(redirectTo);
    } catch (_err) {
      console.error("login error:", _err);
      showMsg(t("Error al iniciar sesión"));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return <p className="text-center mt-20 text-gray-700 dark:text-gray-200">Cargando sesión...</p>;
  }

  const isInvalid = savedEmail === null || password.trim() === "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-500 dark:from-[#070617] dark:via-[#1b1336] dark:to-[#2b0c4a] px-4">
      <div className="relative bg-white/95 dark:bg-[#0b0716]/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-lg p-8 pt-20 transition-colors overflow-visible">
        <div className="absolute left-1/2 -top-12 transform -translate-x-1/2 z-30">
          <div className="rounded-full p-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-[0_18px_40px_rgba(99,102,241,0.24)] ring-4 ring-purple-700/20">
            <Logo className="w-24 h-24" variant="stacked" hideText />
          </div>
        </div>

        <div className="mt-2 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-400 mb-3">
            {t("Bienvenido a NUBO")}
          </h1>
          <p className="max-w-xl mx-auto text-sm md:text-base text-gray-600 dark:text-gray-300 mb-8 px-2">
            {t("Conecta con personas, comparte tus ideas y haz crecer tu comunidad en un espacio seguro y vibrante.")}
          </p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="sr-only">
                {t("Correo electrónico")}
              </label>
              <input
                id="email"
                type="email"
                placeholder={t("Correo electrónico")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 md:p-3.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                required
                aria-label="email"
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">
                {t("Contraseña")}
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("Contraseña")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 md:p-3.5 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                required
                aria-label="password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="h-5 text-center text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
              {msg}
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <a href="/forgot-password" className="hover:underline">
                {t("¿Olvidaste tu contraseña?")}
              </a>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-purple-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {t("Recordarme")}
              </label>
            </div>

            {/* botón escapista (sin cambios de interacción) */}
            <div className="flex justify-center mt-1">
              <button
                type="submit"
                disabled={submitting}
                aria-disabled={isInvalid}
                aria-busy={submitting}
                onMouseEnter={() => {
                  if (isInvalid) shiftButton();
                }}
                onClick={(e) => {
                  if (isInvalid) {
                    e.preventDefault();
                    shiftButton();
                    showMsg(t("Introduce un correo válido con @"));
                    triggerShake();
                  }
                }}
                onFocus={() => {
                  if (isInvalid) shiftButton();
                }}
                className={`inline-flex items-center justify-center gap-2 text-white font-semibold text-sm px-4 py-2 rounded-md transition-transform duration-300 ease-out shadow-lg cursor-pointer
                  ${isInvalid ? "bg-gray-300 text-gray-700" : "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600"}
                  transform
                  ${isInvalid ? POSITIONS[posIndex] : "translate-x-0 translate-y-0"}
                  ${isShaking ? "shake-scale" : ""}`}
              >
                {submitting ? t("Entrando...") : t("Entrar")}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {t("¿No tienes cuenta?")}{" "}
            <a href="/register" className="font-semibold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent hover:underline">
              {t("Crea una aquí")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

