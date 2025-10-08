// pages/404.tsx
import Link from "next/link";

export default function Custom404() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#071018] p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          Página no encontrada.
        </p>
        <Link href="/">
          <a className="inline-block px-5 py-2 rounded-full bg-blue-600 text-white">Volver al inicio</a>
        </Link>
      </div>
    </main>
  );
}
