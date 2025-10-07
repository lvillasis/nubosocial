import Head from "next/head";

export default function Custom500() {
  return (
    <>
      <Head>
        <title>500 - Error</title>
      </Head>
      <main style={{ padding: 40, textAlign: "center" }}>
        <h1>500</h1>
        <p>Error del servidor. Intenta de nuevo más tarde.</p>
      </main>
    </>
  );
}
