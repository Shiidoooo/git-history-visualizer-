import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts a token with no Redis settings", () => {
    const env = parseEnv({ GITHUB_TOKEN: "token" });
    expect(env.GITHUB_TOKEN).toBe("token");
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("accepts a token with both Redis settings", () => {
    const env = parseEnv({
      GITHUB_TOKEN: "token",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
    });
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://example.upstash.io");
  });

  it("rejects a missing GITHUB_TOKEN with a clear message", () => {
    expect(() => parseEnv({})).toThrow(/GITHUB_TOKEN/);
  });

  it("treats a blank GITHUB_TOKEN as missing", () => {
    expect(() => parseEnv({ GITHUB_TOKEN: "" })).toThrow(/GITHUB_TOKEN/);
  });

  it("rejects Redis settings that are only half provided", () => {
    expect(() =>
      parseEnv({ GITHUB_TOKEN: "token", UPSTASH_REDIS_REST_URL: "https://example.upstash.io" }),
    ).toThrow(/must be set together/);
  });

  it("rejects an invalid Redis URL", () => {
    expect(() =>
      parseEnv({
        GITHUB_TOKEN: "token",
        UPSTASH_REDIS_REST_URL: "not-a-url",
        UPSTASH_REDIS_REST_TOKEN: "redis-token",
      }),
    ).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it("never includes secret values in the error message", () => {
    expect(() =>
      parseEnv({ GITHUB_TOKEN: "super-secret-value", UPSTASH_REDIS_REST_URL: "not-a-url" }),
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining("super-secret-value") }));
  });
});
