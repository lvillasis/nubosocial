import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false); // <-- nuevo
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null; // evita usar router en SSR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
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

export const getServerSideProps = async () => ({ props: {} });
