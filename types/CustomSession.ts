// types/CustomSession.ts
import { Session } from "next-auth";

export interface CustomSession extends Session {
  user: Session["user"] & {
    id: string;
    username?: string;
  };
}