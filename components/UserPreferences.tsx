// components/UserPreferences.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function UserPreferences() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // inicializamos desde session si está disponible
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("es");
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    if (session?.user) {
      // los campos personalizados pueden venir en session.user
      const s: any = session.user as any;
      setDarkMode(!!s.darkMode);
      setLanguage(s.language ?? "es");
      setEmailNotifications(typeof s.emailNotifications === "boolean" ? s.emailNotifications : true);
    }
  }, [session]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          darkMode,
          language,
          emailNotifications,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      setMessage({ text: "Preferencias guardadas", type: "success" });

      // Aplicar cambio de theme localmente (si usas clase 'dark' en html)
      try {
        if (darkMode) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      } catch {}

      // refresca para que next-auth recargue session (si necesitas)
      // preferimos reemplazar la ruta para evitar ir al login
      router.replace(router.asPath);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err?.message || "Error al guardar preferencias", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return <div className="text-sm text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Preferencias</h2>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Tema</div>
          <div className="text-xs text-gray-500">Activa modo oscuro</div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode((v) => !v)}
            className="form-checkbox h-5 w-5"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Idioma</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#06060b] text-gray-800 dark:text-gray-100"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Notificaciones por correo</div>
          <div className="text-xs text-gray-500">Recibe alertas por email</div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={() => setEmailNotifications((v) => !v)}
            className="form-checkbox h-5 w-5"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-semibold hover:brightness-105 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar preferencias"}
        </button>

        <button
          onClick={() => {
            // restaurar desde session
            const s: any = session?.user ?? {};
            setDarkMode(!!s.darkMode);
            setLanguage(s.language ?? "es");
            setEmailNotifications(typeof s.emailNotifications === "boolean" ? s.emailNotifications : true);
            setMessage(null);
          }}
          className="px-4 py-2 rounded-lg bg-white/20 dark:bg-white/5"
        >
          Restaurar
        </button>
      </div>

      {message && (
        <div className={`text-sm ${message.type === "success" ? "text-green-500" : "text-red-400"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
