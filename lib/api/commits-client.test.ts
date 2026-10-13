import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommitsPage } from "./commits-client";
import { ApiClientError, isRetryableError } from "./request-api";

const page = { commits: [], nextCursor: null, totalCount: 0 };
const errorBody = (code: string, extra: Record<string, unknown> = {}) => ({
  status: "error",
  data: null,
  message: `message for ${code}`,
  error: { code, details: [], ...extra },
  requestId: "req-1",
});

const respondWith = (body: unknown, status = 200) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

const request = (cursor: string | null = null, signal?: AbortSignal) =>
  fetchCommitsPage({ owner: "vercel", repo: "next.js", cursor, signal });

afterEach(() => vi.unstubAllGlobals());

describe("fetchCommitsPage", () => {
  it("returns the page from a success envelope", async () => {
    respondWith({ status: "success", data: page, message: "OK" });
    await expect(request()).resolves.toEqual(page);
  });

  it("requests the encoded path with the maximum limit", async () => {
    respondWith({ status: "success", data: page, message: "OK" });
    await request();
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toBe("/api/repo/vercel/next.js/commits?limit=100");
  });

  it("sends the cursor when there is one", async () => {
    respondWith({ status: "success", data: page, message: "OK" });
    await request("abc 99");
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(new URL(url, "http://x").searchParams.get("cursor")).toBe("abc 99");
  });

  it("turns an error envelope into a typed error", async () => {
    respondWith(errorBody("REPO_NOT_FOUND"), 404);
    await expect(request()).rejects.toMatchObject({ code: "REPO_NOT_FOUND", message: "message for REPO_NOT_FOUND" });
  });

  it("carries the retry delay for a rate limit", async () => {
    respondWith(errorBody("RATE_LIMITED", { retryAfterSeconds: 90 }), 429);
    await expect(request()).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterSeconds: 90 });
  });

  it.each([
    ["a success body in the wrong shape", { status: "success", data: { commits: "nope" }, message: "OK" }, 200],
    ["an unknown error code", errorBody("SOMETHING_NEW"), 500],
    ["a non-envelope error body", { oops: true }, 500],
  ])("reports BAD_RESPONSE for %s", async (_label, body, status) => {
    respondWith(body, status);
    await expect(request()).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });

  it("reports BAD_RESPONSE when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })));
    await expect(request()).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });

  it("reports NETWORK_ERROR when the request cannot be made", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request()).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("rethrows the abort untouched when the caller cancelled", async () => {
    const controller = new AbortController();
    const abort = new DOMException("cancelled", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      controller.abort();
      throw abort;
    }));
    await expect(request(null, controller.signal)).rejects.toBe(abort);
  });
});

describe("isRetryableError", () => {
  it("does not retry input errors or a missing repository", () => {
    for (const code of ["INVALID_REPO", "INVALID_REQUEST", "REPO_NOT_FOUND"] as const) {
      expect(isRetryableError(new ApiClientError(code, "x"))).toBe(false);
    }
  });

  it("retries transient failures and unknown errors", () => {
    for (const code of ["RATE_LIMITED", "UPSTREAM_ERROR", "NETWORK_ERROR", "TIMEOUT", "BAD_RESPONSE"] as const) {
      expect(isRetryableError(new ApiClientError(code, "x"))).toBe(true);
    }
    expect(isRetryableError(new Error("boom"))).toBe(true);
  });
});
