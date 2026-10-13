import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimiter } from "./memory-limiter";

type UpstashLimiterOptions = {
  url: string;
  token: string;
  limit: number;
  windowSeconds: number;
};

const REDIS_TIMEOUT_MS = 2_000;

/** A sliding-window limiter shared by every server instance through Upstash Redis. */
export function createUpstashLimiter({ url, token, limit, windowSeconds }: UpstashLimiterOptions): RateLimiter {
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "git-visualizer:ratelimit",
    timeout: REDIS_TIMEOUT_MS,
  });

  return {
    async check(key) {
      const result = await ratelimit.limit(key);
      // On a timeout the library silently allows the request. Report it as a failure instead, so the
      // caller can fall back to the in-memory limiter rather than let traffic through unchecked.
      if (result.reason === "timeout") throw new Error("Rate limit store timed out");
      if (result.success) return { allowed: true };
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
    },
  };
}
