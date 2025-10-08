// pages/404.tsx
import Head from "next/head";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - No encontrado</title>
      </Head>
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 48 }}>404</h1>
        <p>La página que buscas no existe.</p>
      </main>
    </>
  );
}

// Workaround temporal para evitar prerender en build
export async function getServerSideProps() {
  return { props: {} };
}
