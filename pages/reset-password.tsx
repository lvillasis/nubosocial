// pages/reset-password.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { id, token } = router.query as { id?: string; token?: string };
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (id && token) setValid(true);
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setMsg("Enlace inválido.");
    if (password.length < 8) return setMsg("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return setMsg("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token, password }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg("Contraseña actualizada. Serás redirigido al login.");
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setMsg(json?.error || "Error al restablecer contraseña");
      }
    } catch (_err) {
      console.error(_err);
      setMsg("Error del servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="...">
      <h1>Elige una nueva contraseña</h1>
      <form onSubmit={handleSubmit}>
        <input type="password" required placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" required placeholder="Repite la contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button disabled={loading}>{loading ? "Guardando..." : "Cambiar contraseña"}</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
