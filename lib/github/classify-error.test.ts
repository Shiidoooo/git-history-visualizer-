import { describe, expect, it } from "vitest";
import { classifyGithubError } from "./classify-error";
import { GithubApiError } from "./errors";

const NOW = new Date("2026-01-01T00:00:00Z");
const NOW_EPOCH = NOW.getTime() / 1000;

describe("classifyGithubError", () => {
  it("passes our own errors through unchanged", () => {
    const original = new GithubApiError("INVALID_REPO");
    expect(classifyGithubError(original)).toBe(original);
  });

  it("maps a GraphQL NOT_FOUND error to REPO_NOT_FOUND", () => {
    const error = { errors: [{ type: "NOT_FOUND", message: "Could not resolve to a Repository" }] };
    expect(classifyGithubError(error, NOW).code).toBe("REPO_NOT_FOUND");
  });

  it("maps an HTTP 404 to REPO_NOT_FOUND", () => {
    expect(classifyGithubError({ status: 404 }, NOW).code).toBe("REPO_NOT_FOUND");
  });

  it("maps a GraphQL RATE_LIMITED error to RATE_LIMITED", () => {
    const error = {
      errors: [{ type: "RATE_LIMITED" }],
      headers: { "x-ratelimit-reset": String(NOW_EPOCH + 120) },
    };
    const result = classifyGithubError(error, NOW);
    expect(result.code).toBe("RATE_LIMITED");
    expect(result.retryAfterSeconds).toBe(120);
  });

  it("maps HTTP 429 to RATE_LIMITED and honors retry-after", () => {
    const result = classifyGithubError({ status: 429, response: { headers: { "retry-after": "30" } } }, NOW);
    expect(result).toMatchObject({ code: "RATE_LIMITED", retryAfterSeconds: 30 });
  });

  it("maps a 403 with no remaining quota to RATE_LIMITED", () => {
    const error = { status: 403, response: { headers: { "x-ratelimit-remaining": "0" } } };
    expect(classifyGithubError(error, NOW).code).toBe("RATE_LIMITED");
  });

  it("maps a 403 mentioning a rate limit to RATE_LIMITED", () => {
    const error = { status: 403, message: "You have exceeded a secondary rate limit" };
    expect(classifyGithubError(error, NOW).code).toBe("RATE_LIMITED");
  });

  it("does not treat an ordinary 403 as a rate limit", () => {
    expect(classifyGithubError({ status: 403, message: "Resource not accessible" }, NOW).code).toBe(
      "UPSTREAM_ERROR",
    );
  });

  it("falls back to 60 seconds when GitHub gives no reset time", () => {
    expect(classifyGithubError({ status: 429 }, NOW).retryAfterSeconds).toBe(60);
  });

  it("never returns a retry time below 1 second or above an hour", () => {
    const past = { status: 429, headers: { "x-ratelimit-reset": String(NOW_EPOCH - 500) } };
    const far = { status: 429, headers: { "retry-after": "999999" } };
    expect(classifyGithubError(past, NOW).retryAfterSeconds).toBe(1);
    expect(classifyGithubError(far, NOW).retryAfterSeconds).toBe(3600);
  });

  it("maps a bad token (401) to UPSTREAM_ERROR so credentials issues are not exposed", () => {
    expect(classifyGithubError({ status: 401, message: "Bad credentials" }, NOW).code).toBe("UPSTREAM_ERROR");
  });

  it("maps timeouts and unknown values to UPSTREAM_ERROR", () => {
    expect(classifyGithubError(new DOMException("timed out", "TimeoutError"), NOW).code).toBe("UPSTREAM_ERROR");
    expect(classifyGithubError("boom", NOW).code).toBe("UPSTREAM_ERROR");
    expect(classifyGithubError(null, NOW).code).toBe("UPSTREAM_ERROR");
  });

  it("never puts GitHub's raw message in the safe message", () => {
    const result = classifyGithubError({ status: 500, message: "SELECT secret FROM internal" }, NOW);
    expect(result.code).toBe("UPSTREAM_ERROR");
  });
});
