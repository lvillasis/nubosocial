import Head from "next/head";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - No encontrado</title>
      </Head>
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1>404</h1>
        <p>La página que buscas no existe.</p>
      </main>
    </>
  );
}
