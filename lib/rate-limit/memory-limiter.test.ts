import { describe, expect, it } from "vitest";
import { createMemoryLimiter } from "./memory-limiter";

function setup(options: { limit?: number; windowMs?: number; maxKeys?: number } = {}) {
  let time = 1_000_000;
  const limiter = createMemoryLimiter({
    limit: options.limit ?? 3,
    windowMs: options.windowMs ?? 60_000,
    maxKeys: options.maxKeys,
    now: () => time,
  });
  return { limiter, advance: (ms: number) => (time += ms) };
}

describe("createMemoryLimiter", () => {
  it("allows requests up to the limit and denies the next one", async () => {
    const { limiter } = setup({ limit: 3 });
    expect(await limiter.check("a")).toEqual({ allowed: true });
    expect(await limiter.check("a")).toEqual({ allowed: true });
    expect(await limiter.check("a")).toEqual({ allowed: true });
    expect((await limiter.check("a")).allowed).toBe(false);
  });

  it("tells the caller how long until the oldest request leaves the window", async () => {
    const { limiter, advance } = setup({ limit: 1, windowMs: 60_000 });
    await limiter.check("a");
    advance(45_000);
    expect(await limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("rounds a partial second up and never returns less than one", async () => {
    const { limiter, advance } = setup({ limit: 1, windowMs: 60_000 });
    await limiter.check("a");
    advance(59_999);
    expect(await limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("allows requests again once the window has passed", async () => {
    const { limiter, advance } = setup({ limit: 1, windowMs: 60_000 });
    await limiter.check("a");
    expect((await limiter.check("a")).allowed).toBe(false);
    advance(60_000);
    expect(await limiter.check("a")).toEqual({ allowed: true });
  });

  it("slides: a request ages out on its own schedule instead of all at once", async () => {
    const { limiter, advance } = setup({ limit: 2, windowMs: 60_000 });
    await limiter.check("a");
    advance(30_000);
    await limiter.check("a");
    advance(30_000); // the first request is now 60s old, the second 30s
    expect(await limiter.check("a")).toEqual({ allowed: true });
    expect((await limiter.check("a")).allowed).toBe(false);
  });

  it("does not count denied requests against the caller", async () => {
    const { limiter, advance } = setup({ limit: 1, windowMs: 60_000 });
    await limiter.check("a");
    advance(30_000);
    for (let i = 0; i < 5; i++) await limiter.check("a");
    advance(30_000); // only the one allowed request is old enough to expire
    expect(await limiter.check("a")).toEqual({ allowed: true });
  });

  it("tracks each key separately", async () => {
    const { limiter } = setup({ limit: 1 });
    await limiter.check("a");
    expect((await limiter.check("a")).allowed).toBe(false);
    expect(await limiter.check("b")).toEqual({ allowed: true });
  });

  it("stays within the key cap by forgetting the least recently active client", async () => {
    const { limiter } = setup({ limit: 1, maxKeys: 2 });
    await limiter.check("a");
    await limiter.check("b");
    await limiter.check("c"); // pushes "a" out
    expect(await limiter.check("a")).toEqual({ allowed: true });
    expect((await limiter.check("c")).allowed).toBe(false);
  });

  it("clears expired clients before it evicts an active one", async () => {
    const { limiter, advance } = setup({ limit: 1, maxKeys: 2, windowMs: 60_000 });
    await limiter.check("old");
    advance(60_000);
    await limiter.check("active");
    await limiter.check("new"); // "old" expired, so "active" must survive
    expect((await limiter.check("active")).allowed).toBe(false);
  });
});
