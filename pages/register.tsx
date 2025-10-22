// pages/register.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Logo from "@/components/Logo";
import {
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaUser,
  FaAt,
  FaLock,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // manejar imagen y previsualización
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(url);
    }
  };

  // limpiar preview al desmontar
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // verificación con debounce
  useEffect(() => {
    setUsernameAvailable(null);
    if (username.trim().length <= 2) {
      setIsCheckingUsername(false);
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    const delayDebounce = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(usernameToCheck)}`);
      const data = await res.json();
      setUsernameAvailable(Boolean(data?.available));
    } catch (_err) {
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const canSubmit = () => {
    if (loading) return false;
    if (username.trim().length < 3) return false;
    if (password.length < 6) return false;
    if (usernameAvailable === false) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) {
      toast.error(
        "Revisa tus datos. Asegúrate de que el nombre de usuario esté disponible y la contraseña tenga al menos 6 caracteres."
      );
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("username", username);
    formData.append("email", email);
    formData.append("password", password);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success("🎉 Cuenta creada exitosamente en NuboSocial");
        router.push("/login");
      } else {
        toast.error(data.message || "❌ Error al registrar");
      }
    } catch {
      setLoading(false);
      toast.error("No se pudo conectar con el servidor. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 px-4 py-10">
      <div className="w-full max-w-lg bg-white/5 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Logo className="w-14 h-14" />
          <div>
            <h1 className="text-2xl font-extrabold text-white dark:text-slate-100">
              Crear cuenta en NuboSocial
            </h1>
            <p className="text-sm text-slate-200/80 dark:text-slate-300 mt-1">
              Únete, comparte y conecta con tu comunidad.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <label htmlFor="image" className="relative cursor-pointer">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-white/10 flex items-center justify-center">
                <Image
                  src={preview || "/default-avatar.png"}
                  alt="Avatar de usuario"
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full shadow z-10 border-2 border-white/20">
                <FaCamera size={14} />
              </div>
            </label>
            <input type="file" id="image" accept="image/*" onChange={handleImageChange} className="hidden" />
            <div className="text-sm text-slate-200/80">Foto opcional (máx. 3MB)</div>
          </div>

          {/* Nombre */}
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-200 flex items-center gap-2">
              <FaUser /> Nombre completo
            </div>
            <input
              type="text"
              placeholder="Ej. Ana Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          {/* Username */}
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-200 flex items-center gap-2">
              <FaAt /> Nombre de usuario
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. ana_perez"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full p-3 pr-28 rounded-lg bg-white/10 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  usernameAvailable === null
                    ? "border border-white/20"
                    : usernameAvailable
                    ? "border border-green-500"
                    : "border border-red-500"
                }`}
                minLength={3}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                {isCheckingUsername ? (
                  <FaSpinner className="w-5 h-5 animate-spin text-slate-200" />
                ) : usernameAvailable === true ? (
                  <FaCheckCircle className="w-5 h-5 text-green-400" />
                ) : usernameAvailable === false ? (
                  <FaTimesCircle className="w-5 h-5 text-red-400" />
                ) : null}
              </div>
            </div>
            <p
              className={`mt-1 text-sm ${
                username.trim().length <= 2
                  ? "text-slate-200/70"
                  : usernameAvailable
                  ? "text-green-400"
                  : usernameAvailable === false
                  ? "text-red-400"
                  : "text-slate-200/70"
              }`}
            >
              {username.trim().length <= 2
                ? "Ingresa al menos 3 caracteres para verificar."
                : isCheckingUsername
                ? "Verificando disponibilidad..."
                : usernameAvailable === null
                ? "Verificación no disponible"
                : usernameAvailable
                ? "¡Nombre de usuario disponible!"
                : "Nombre de usuario en uso"}
            </p>
          </label>

          {/* Email */}
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-200 flex items-center gap-2">
              <FaAt /> Correo electrónico
            </div>
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </label>

          {/* Contraseña */}
          <label className="block">
            <div className="mb-1 text-sm font-medium text-slate-200 flex items-center gap-2">
              <FaLock /> Contraseña
            </div>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="mt-1 text-xs text-slate-200/70">
              Usa una contraseña segura para proteger tu cuenta.
            </p>
          </label>

          {/* Botón */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit()}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition ${
                canSubmit()
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-400 cursor-not-allowed text-slate-200"
              }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" /> Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-200/80 mt-5">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-blue-200 font-medium hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
