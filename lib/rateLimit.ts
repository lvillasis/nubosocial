// lib/rateLimit.ts 
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Multi-policy rate limiter.
 * - Usa Upstash si hay vars de entorno.
 * - Fallback en memoria para desarrollo (no distribuido).
 *
 * Políticas por defecto (ajustables):
 *  - search: 30 req / 1m
 *  - preview: 60 req / 1m
 *  - create: 20 req / 1m
 *  - trending: 200 req / 1m
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type PolicyName = "search" | "preview" | "create" | "trending" | "default";

const POLICIES: Record<PolicyName, { limit: number; duration: string }> = {
  search: { limit: 30, duration: "1 m" },
  preview: { limit: 60, duration: "1 m" },
  create: { limit: 20, duration: "1 m" },
  trending: { limit: 200, duration: "1 m" },
  default: { limit: 60, duration: "1 m" },
};

let redisClient: Redis | null = null;
if (UPSTASH_URL && UPSTASH_TOKEN) {
  try {
    redisClient = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  } catch (err) {
    console.warn("Upstash Redis init failed:", err);
    redisClient = null;
  }
}

const upstashLimiters: Partial<Record<PolicyName, any>> = {};
if (redisClient) {
  for (const p of Object.keys(POLICIES) as PolicyName[]) {
    const { limit, duration } = POLICIES[p];
    try {
      // casteo a any para evitar incompatibilidades de tipos entre versiones de la lib
      upstashLimiters[p] = new Ratelimit({
        redis: redisClient,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        limiter: (Ratelimit as any).slidingWindow(limit, duration),
      });
    } catch (err) {
      console.warn("Failed to create Upstash limiter for", p, err);
      upstashLimiters[p] = null;
    }
  }
}

/** in-memory fallback stores per policy */
const memoryStores: Record<PolicyName, Map<string, { count: number; expiresAt: number }>> = {
  search: new Map(),
  preview: new Map(),
  create: new Map(),
  trending: new Map(),
  default: new Map(),
};

function checkMemoryLimit(key: string, policy: PolicyName) {
  const { limit } = POLICIES[policy];
  const windowMs = 60_000; // current config uses "1 m" windows
  const now = Date.now();
  const store = memoryStores[policy];
  const rec = store.get(key);
  if (!rec || rec.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (rec.count >= limit) {
    return { success: false, remaining: 0, reset: rec.expiresAt };
  }
  rec.count += 1;
  store.set(key, rec);
  return { success: true, remaining: Math.max(0, limit - rec.count), reset: rec.expiresAt };
}

/**
 * checkRateLimitFor(policy, key)
 */
export async function checkRateLimitFor(policy: PolicyName, key: string) {
  const k = String(key || "anon");
  const limiter = upstashLimiters[policy];
  if (limiter) {
    try {
      const res = await limiter.limit(k);
      return {
        success: !!res.success,
        remaining: typeof res.remaining !== "undefined" ? res.remaining : undefined,
        reset: typeof res.reset !== "undefined" ? res.reset : undefined,
        meta: res,
      };
    } catch (err) {
      console.error("Upstash limiter error (falling back to memory):", err);
      return checkMemoryLimit(k, policy);
    }
  } else {
    return checkMemoryLimit(k, policy);
  }
}

/** Convenience wrappers */
export const checkRateLimitSearch = (key: string) => checkRateLimitFor("search", key);
export const checkRateLimitPreview = (key: string) => checkRateLimitFor("preview", key);
export const checkRateLimitCreate = (key: string) => checkRateLimitFor("create", key);
export const checkRateLimitTrending = (key: string) => checkRateLimitFor("trending", key);
export const checkRateLimitDefault = (key: string) => checkRateLimitFor("default", key);
