// ✅ pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import Layout from "@/components/Layout";
import { ThemeProvider } from "next-themes";

function MyApp({ Component, pageProps: { session, ...pageProps }, router }: AppProps) {
  const noLayoutRoutes = ["/login", "/register"];
  const hideNavbar = noLayoutRoutes.includes(router.pathname);

  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Layout showNavbar={!hideNavbar}>
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default appWithTranslation(MyApp);
