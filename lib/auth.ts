import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "./prisma";

const REFRESH_TOKEN_HASH_ALGO = "sha256";

/** Hash SHA256 hex para refresh tokens (almacenamos este hash en BD). */
export function hashRefreshToken(token: string): string {
  return crypto.createHash(REFRESH_TOKEN_HASH_ALGO).update(token).digest("hex");
}

/** Hash SHA256 genérico (para reset tokens, email links, etc). */
export function hashTokenSHA256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Buscar registro de refresh token por el token "en claro". */
export async function findRefreshTokenRecordByToken(token: string) {
  const tokenHash = hashRefreshToken(token);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  return record;
}

/** Marcar refresh token como usado (revocar). */
export async function markRefreshTokenUsed(id: string) {
  return prisma.refreshToken.update({ where: { id }, data: { used: true } });
}

/** Verifica la contraseña del usuario. user.password debe ser bcrypt-hash. */
export async function verifyPassword(user: { password?: string }, candidate: string) {
  if (!user?.password) return false;
  return bcrypt.compare(candidate, user.password);
}

/** Hash de password (útil en signup). */
export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
