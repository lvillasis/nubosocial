// types/domain.ts
import type { Post, Comment, User } from "@prisma/client";

/**
 * Comentario con autor (forma estable que usará el frontend)
 * author puede ser null si Prisma lo devuelve así.
 */
export type CommentWithAuthor = Comment & {
  author: Pick<User, "id" | "name" | "image" | "username"> | null;
};

/**
 * Post con relaciones usadas en UI
 */
export type PostWithRelations = Post & {
  author: Pick<User, "id" | "name" | "image" | "username"> | null;
  comments: CommentWithAuthor[];
  likes?: { userId: string }[];
  // Campos auxiliares que a veces añades desde el backend/frontend:
  likesCount?: number;
  liked?: boolean;
};
