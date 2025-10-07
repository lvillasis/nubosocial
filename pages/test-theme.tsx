import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function TestThemePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black dark:bg-black dark:text-white transition-all duration-500">
      <h1 className="text-2xl mb-4">Tema actual: {resolvedTheme}</h1>
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Cambiar tema
      </button>
    </div>
  );
}

export const getServerSideProps = async () => ({ props: {} });
