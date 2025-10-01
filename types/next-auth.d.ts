// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string | null;
      username?: string | null;
      coverImage?: string | null;
      darkMode?: boolean;
      language?: string | null;
      emailNotifications?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
    username?: string;
    coverImage?: string | null;
    password?: string | null;
    darkMode?: boolean;
    language?: string | null;
    emailNotifications?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    coverImage?: string | null;
    darkMode?: boolean;
    language?: string | null;
    emailNotifications?: boolean;
  }
}

export {};
