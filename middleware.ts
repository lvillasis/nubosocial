// middleware.ts
import { withAuth } from "next-auth/middleware";

// Protege rutas específicas
export default withAuth({
  pages: {
    signIn: "/login", // Redirección personalizada si no hay sesión
  },
  callbacks: {
    authorized: ({ token }) => !!token, // Solo permite acceso si hay sesión activa
  },
});

// 👇 Aquí defines en qué rutas se aplica el middleware
export const config = {
  matcher: ["/", "/profile", "/news"],
};