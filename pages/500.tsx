import Head from 'next/head';

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Error 500</title>
      </Head>
      <main style={{minHeight: '100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <h1>500 - Server error</h1>
      </main>
    </>
  );
}
