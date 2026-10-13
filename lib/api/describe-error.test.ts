import { describe, expect, it } from "vitest";
import { ApiClientError, isRetryableError } from "./request-api";
import { describeError } from "./describe-error";

describe("describeError", () => {
  it("explains a missing repository and offers no retry", () => {
    const result = describeError(new ApiClientError("REPO_NOT_FOUND", "Repository not found. It may be private."));
    expect(result).toEqual({
      title: "Repository not found",
      message: "It may not exist, or it may be private. Only public repositories are supported.",
      canRetry: false,
    });
  });

  it("tells the reader how long to wait after a rate limit", () => {
    const result = describeError(new ApiClientError("RATE_LIMITED", "limited", 600));
    expect(result.title).toMatch(/rate limit/i);
    expect(result.message).toContain("about 10 minutes");
    expect(result.canRetry).toBe(true);
  });

  it("still explains a rate limit when no wait time is known", () => {
    const result = describeError(new ApiClientError("RATE_LIMITED", "limited"));
    expect(result.message).not.toContain("Try again in");
  });

  it("tells the reader how long to wait after being limited, without blaming GitHub", () => {
    const result = describeError(new ApiClientError("TOO_MANY_REQUESTS", "slow down", 30));
    expect(result.title).toBe("Too many requests");
    expect(result.message).toContain("about a minute");
    expect(result.message).not.toMatch(/github/i);
    expect(result.canRetry).toBe(true);
  });

  it("does not retry a limited request automatically", () => {
    expect(isRetryableError(new ApiClientError("TOO_MANY_REQUESTS", "slow down", 30))).toBe(false);
    expect(isRetryableError(new ApiClientError("UPSTREAM_ERROR", "down"))).toBe(true);
  });

  it.each(["INVALID_REPO", "INVALID_REQUEST"] as const)("does not offer a retry for %s", (code) => {
    expect(describeError(new ApiClientError(code, "bad input")).canRetry).toBe(false);
  });

  it.each(["UPSTREAM_ERROR", "NETWORK_ERROR", "TIMEOUT", "BAD_RESPONSE", "INTERNAL_ERROR"] as const)(
    "offers a retry for %s and uses the safe message",
    (code) => {
      const result = describeError(new ApiClientError(code, "safe message"));
      expect(result).toEqual({ title: "Couldn't load commits", message: "safe message", canRetry: true });
    },
  );

  it("never shows the text of an unexpected error", () => {
    const result = describeError(new Error("connect ECONNREFUSED 10.0.0.5"));
    expect(result.message).toBe("Something went wrong. Please try again.");
    expect(result.canRetry).toBe(true);
  });

  it("handles non-error values", () => {
    expect(describeError(undefined).canRetry).toBe(true);
    expect(describeError("boom").message).not.toContain("boom");
  });
});
