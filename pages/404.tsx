// pages/404.tsx
import Head from "next/head";
import Link from "next/link";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - No encontrado</title>
      </Head>
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 48, marginBottom: 12 }}>404</h1>
        <p style={{ marginBottom: 18 }}>La página que buscas no existe.</p>
        <Link href="/">
          <a style={{ color: "#fff", background: "#2563eb", padding: "8px 14px", borderRadius: 8, textDecoration: "none" }}>
            Volver al inicio
          </a>
        </Link>
      </main>
    </>
  );
}
