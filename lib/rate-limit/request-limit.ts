import { getEnv } from "@/lib/env";
import { getClientIp } from "./client-ip";
import { createMemoryLimiter, type RateLimitDecision, type RateLimiter } from "./memory-limiter";
import { createUpstashLimiter } from "./upstash-limiter";

// 30 requests a minute per client. One dashboard visit uses about three, so this leaves room for
// several repositories a minute while stopping a script from draining the GitHub token's quota.
export const RATE_LIMIT_REQUESTS = 30;
export const RATE_LIMIT_WINDOW_SECONDS = 60;

const FALLBACK_LOG_INTERVAL_MS = 60_000;

type FallbackOptions = {
  onFallback?: (error: unknown) => void;
};

/**
 * Uses the shared limiter, and the per-instance one whenever the shared one fails.
 * A broken Redis weakens the limit; it never switches it off and never blocks real visitors.
 */
export function withFallback(
  primary: RateLimiter,
  fallback: RateLimiter,
  { onFallback = () => {} }: FallbackOptions = {},
): RateLimiter {
  return {
    async check(key) {
      try {
        return await primary.check(key);
      } catch (error) {
        onFallback(error);
        return fallback.check(key);
      }
    },
  };
}

function logFallbackSometimes() {
  let lastLoggedAt = 0;
  return (error: unknown) => {
    const currentTime = Date.now();
    if (currentTime - lastLoggedAt < FALLBACK_LOG_INTERVAL_MS) return;
    lastLoggedAt = currentTime;
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rate_limit_store_unavailable",
        cause: error instanceof Error ? error.message : undefined,
      }),
    );
  };
}

let cachedLimiter: RateLimiter | undefined;

function getRateLimiter(): RateLimiter {
  if (cachedLimiter) return cachedLimiter;

  const memory = createMemoryLimiter({
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = getEnv();

  cachedLimiter =
    url && token
      ? withFallback(
          createUpstashLimiter({ url, token, limit: RATE_LIMIT_REQUESTS, windowSeconds: RATE_LIMIT_WINDOW_SECONDS }),
          memory,
          { onFallback: logFallbackSometimes() },
        )
      : memory;
  return cachedLimiter;
}

/** Counts this request against its client's allowance and says whether it may proceed. */
export function checkRequestRateLimit(request: Request): Promise<RateLimitDecision> {
  return getRateLimiter().check(getClientIp(request.headers));
}
