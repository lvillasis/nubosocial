// pages/forgot-password.tsx
import { useState } from "react";
import { useRouter } from "next/router";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Mostrar mensaje genérico y redirigir a login si quieres
      setMsg("Si existe una cuenta con ese correo recibirás un email con instrucciones.");
      setEmail("");
      setTimeout(() => router.push("/login"), 4000);
    } catch (_err) {
      console.error(_err);
      setMsg("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="...">
      <h1>Restablecer contraseña</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" />
        <button disabled={loading}>{loading ? "Enviando..." : "Enviar enlace de restablecimiento"}</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
