export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  check(key: string): Promise<RateLimitDecision>;
};

type MemoryLimiterOptions = {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys, so a flood of distinct clients cannot grow memory without limit. */
  maxKeys?: number;
  now?: () => number;
};

const DEFAULT_MAX_KEYS = 10_000;

/**
 * A sliding-window limiter that lives in one server instance's memory. Instances do not share it,
 * so it is only a safety net for when the shared Redis limiter is unavailable or not configured.
 */
export function createMemoryLimiter({
  limit,
  windowMs,
  maxKeys = DEFAULT_MAX_KEYS,
  now = Date.now,
}: MemoryLimiterOptions): RateLimiter {
  const hitsByKey = new Map<string, number[]>();

  function dropExpired(currentTime: number) {
    for (const [key, hits] of hitsByKey) {
      if (hits.at(-1)! <= currentTime - windowMs) hitsByKey.delete(key);
    }
  }

  return {
    async check(key) {
      const currentTime = now();
      const recent = (hitsByKey.get(key) ?? []).filter((hit) => hit > currentTime - windowMs);

      if (recent.length >= limit) {
        hitsByKey.set(key, recent);
        const retryAfterMs = recent[0] + windowMs - currentTime;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }

      recent.push(currentTime);
      // Re-insert so the Map's iteration order stays "least recently active first".
      hitsByKey.delete(key);
      hitsByKey.set(key, recent);

      if (hitsByKey.size > maxKeys) {
        dropExpired(currentTime);
        // Still full of active clients: forget the one that has been quiet the longest.
        if (hitsByKey.size > maxKeys) hitsByKey.delete(hitsByKey.keys().next().value!);
      }
      return { allowed: true };
    },
  };
}
