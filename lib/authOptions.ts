// lib/authOptions.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

/**
 * authOptions para NextAuth (PrismaAdapter + Google + Credentials)
 *
 * Nota: para crear la cookie HttpOnly con refresh token, usa el endpoint
 * /api/auth/refresh/create (server-side) *después* de signIn() desde el cliente.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        // Nota: NextAuth no valida tipos para campos extra; lo leemos en authorize si se envía
        remember: { label: "Remember", type: "boolean" } as any,
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        // Devuelve el usuario completo (NextAuth almacenará lo necesario en el token)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        } as any;
      },
    }),
  ],

  // Secrets
  secret: process.env.NEXTAUTH_SECRET || process.env.ACCESS_TOKEN_SECRET,
  session: {
    strategy: "jwt",
    // opcional: maxAge en segundos
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    /**
     * jwt: se ejecuta en cada solicitud. `user` existe sólo en el momento del login.
     * Rellenamos token con campos de DB (si ya no están).
     */
    async jwt({ token, user }: any) {
      // Si user existe (primer login), añadimos valores iniciales
      if (user) {
        // user proviene de authorize() o del provider OAuth
        token.id = user.id ?? token.id;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }

      // Si no tenemos datos completos pero sí email, traemos del DB para rellenar
      if (token?.email && !token?.username) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              image: true,
              coverImage: true,
              language: true,
              emailNotifications: true,
              darkMode: true,
            },
          });

          if (dbUser) {
            token.id = dbUser.id ?? token.id;
            token.username = dbUser.username ?? token.username;
            token.name = dbUser.name ?? token.name;
            token.email = dbUser.email ?? token.email;
            token.image = dbUser.image ?? token.image;
            token.coverImage = dbUser.coverImage ?? token.coverImage;
            token.language = dbUser.language ?? token.language ?? "es";
            token.emailNotifications = dbUser.emailNotifications ?? token.emailNotifications ?? true;
            token.darkMode = dbUser.darkMode ?? token.darkMode ?? false;
          }
        } catch (_err) {
          console.warn("authOptions.jwt dbUser lookup failed:", _err);
        }
      }

      return token;
    },

    /**
     * session: copiar valores del token al objeto session.user que consume tu UI.
     */
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id ?? null;
        session.user.username = token.username ?? null;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
        session.user.image = token.image ?? null;
        session.user.coverImage = token.coverImage ?? null;

        // preferencias
        session.user.darkMode = token.darkMode ?? false;
        session.user.language = token.language ?? "es";
        session.user.emailNotifications = token.emailNotifications ?? true;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  // logging en dev
  debug: process.env.NODE_ENV === "development",
};

export default authOptions;
