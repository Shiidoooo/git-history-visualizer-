import { describe, expect, it, vi } from "vitest";
import type { RateLimiter } from "./memory-limiter";
import { withFallback } from "./request-limit";

const allowing: RateLimiter = { check: vi.fn().mockResolvedValue({ allowed: true }) };
const denying: RateLimiter = {
  check: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 12 }),
};
const broken = (): RateLimiter => ({ check: vi.fn().mockRejectedValue(new Error("NOPERM")) });

describe("withFallback", () => {
  it("uses the primary limiter's answer when it works", async () => {
    const fallback = { check: vi.fn() };
    const limiter = withFallback(denying, fallback);
    expect(await limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 12 });
    expect(fallback.check).not.toHaveBeenCalled();
  });

  it("uses the fallback's answer when the primary fails", async () => {
    const limiter = withFallback(broken(), denying);
    expect(await limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 12 });
  });

  it("reports the failure to the caller-supplied handler", async () => {
    const onFallback = vi.fn();
    await withFallback(broken(), allowing, { onFallback }).check("a");
    expect(onFallback).toHaveBeenCalledWith(expect.objectContaining({ message: "NOPERM" }));
  });

  it("passes the same key to the fallback", async () => {
    const fallback = { check: vi.fn().mockResolvedValue({ allowed: true }) };
    await withFallback(broken(), fallback).check("203.0.113.7");
    expect(fallback.check).toHaveBeenCalledWith("203.0.113.7");
  });
});
