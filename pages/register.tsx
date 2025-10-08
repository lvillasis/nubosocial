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

// 🔧 Evita prerender para prevenir el error "NextRouter not mounted"
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false); // ✅ para saber si ya está en cliente
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
      toast.error("Revisa tus datos. Asegúrate que el nombre de usuario esté disponible y la contraseña tenga al menos 6 caracteres.");
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
      // ✅ Solo redirigir si está montado en cliente
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ...todo igual que tu código original... */}
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
