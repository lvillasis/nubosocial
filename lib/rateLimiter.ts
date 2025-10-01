// lib/rateLimiter.ts
import { checkRateLimitDefault } from "./rateLimit";

/**
 * Wrapper pequeño y seguro alrededor de checkRateLimitDefault (Upstash/Memory).
 * - consume(key): Promise<void>
 *    - resuelve si está permitido
 *    - lanza un Error con .msBeforeNext y .remaining si está rate-limited
 *    - si la comprobación falla por infra, hace FAIL-OPEN (permite)
 *
 * Nota: checkRateLimitDefault debe devolver el objeto:
 *   { success: boolean, remaining?: number, reset?: number, meta?: any }
 */

type RLResult = {
  success: boolean;
  remaining?: number;
  reset?: number | undefined;
  meta?: any;
};

export const rl = {
  consume: async (key: string): Promise<void> => {
    try {
      const r = (await checkRateLimitDefault(key)) as RLResult;

      // Si la biblioteca interna devolvió algo inesperado, permitimos (fail-open)
      if (!r || typeof r !== "object") return;

      if (r.success) {
        // permitido
        return;
      }

      // rechazado por límite -> normalizamos un objeto error con msBeforeNext
      const now = Date.now();
      // reset puede venir como timestamp (ms) o undefined
      const resetTs = typeof r.reset === "number" ? r.reset : now + 60_000;
      const msBeforeNext = Math.max(0, resetTs - now);

      const err: any = new Error("Rate limit exceeded");
      err.msBeforeNext = msBeforeNext;
      err.remainingPoints = typeof r.remaining === "number" ? r.remaining : 0;
      err.meta = r.meta; // opcional, sólo para debug (no exigente)
      throw err;
    } catch (err: any) {
      // Si el error viene de la comprobación (rate-limit) lo dejaremos propagar.
      // Si es un error de infraestructura (p. ej. DNS/Upstash throws), lo registramos y permitimos (fail-open).
      const looksLikeRateLimitReject =
        err && (typeof err === "object") && ("msBeforeNext" in err || "remainingPoints" in err);

      if (looksLikeRateLimitReject) {
        throw err; // pasar el rechazo al handler (esperado)
      }

      // infra error: log y permitir (fail-open) para no romper la experiencia de usuarios reales
      console.warn("[rateLimiter] infra error - allowing request (fail-open):", err?.message ?? err);
      return;
    }
  },
};

export default rl;
