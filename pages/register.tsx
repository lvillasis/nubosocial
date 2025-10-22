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

export const dynamic = "force-dynamic"; // 🔧 Evita prerender (necesario para NextRouter)

export default function RegisterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // ✅ Manejo de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(url);
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ✅ Verificación de disponibilidad de username (con debounce)
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
    }, 400);

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

  // ✅ Validación de formulario
  const canSubmit = () => {
    if (loading) return false;
    if (username.trim().length < 3) return false;
    if (password.length < 6) return false;
    if (usernameAvailable === false) return false;
    return true;
  };

  // ✅ Envío del formulario
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

    let res: Response;
    try {
      res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });
    } catch {
      setLoading(false);
      toast.error("No se pudo conectar con el servidor. Intenta de nuevo.");
      return;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: "Respuesta no válida del servidor" };
    }

    setLoading(false);

    if (res.ok) {
      toast.success("🎉 Cuenta creada exitosamente en NuboSocial");
      if (mounted) router.push("/login");
    } else {
      toast.error(data.message || "❌ Error al registrar");
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

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Imagen de perfil */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                {preview ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <FaUser className="text-slate-400 text-4xl" />
                )}
              </div>
              <label
                htmlFor="image"
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600"
              >
                <FaCamera />
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="text-sm text-slate-300">Sube una foto de perfil (opcional)</p>
          </div>

          {/* Nombre */}
          <div>
            <label className="flex items-center gap-2 text-slate-200 font-medium">
              <FaUser /> Nombre completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2 rounded-lg bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Tu nombre"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="flex items-center gap-2 text-slate-200 font-medium">
              <FaAt /> Nombre de usuario
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full mt-1 px-4 py-2 rounded-lg bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="ejemplo: nubo_user"
                required
              />
              <div className="absolute right-3 top-3">
                {isCheckingUsername && (
                  <FaSpinner className="animate-spin text-slate-400" />
                )}
                {!isCheckingUsername && usernameAvailable === true && (
                  <FaCheckCircle className="text-green-400" />
                )}
                {!isCheckingUsername && usernameAvailable === false && (
                  <FaTimesCircle className="text-red-400" />
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Debe tener al menos 3 caracteres y ser único.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-slate-200 font-medium">
              <FaAt /> Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 rounded-lg bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="tucorreo@nubo.com"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="flex items-center gap-2 text-slate-200 font-medium">
              <FaLock /> Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 rounded-lg bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={!canSubmit()}
            className={`w-full py-3 rounded-lg font-bold transition ${
              canSubmit()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
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

// SSR vacío para evitar errores de prerender con router
export async function getServerSideProps() {
  return { props: {} };
}
