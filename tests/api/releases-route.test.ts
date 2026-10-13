import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubApiError } from "@/lib/github/errors";

vi.mock("@/lib/github/releases", () => ({ fetchReleases: vi.fn() }));

import { GET } from "@/app/api/repo/[owner]/[repo]/releases/route";
import { fetchReleases } from "@/lib/github/releases";

const mockedFetch = vi.mocked(fetchReleases);

const call = (owner = "vercel", repo = "next.js") =>
  GET(new Request(`http://localhost/api/repo/${owner}/${repo}/releases`), {
    params: Promise.resolve({ owner, repo }),
  });

describe("GET /api/repo/[owner]/[repo]/releases", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns releases in the success envelope", async () => {
    const data = { releases: [{ tag: "v1", name: "v1", publishedAt: "2026-01-01T00:00:00Z" }] };
    mockedFetch.mockResolvedValue(data);
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success", data, message: "Releases loaded" });
    expect(mockedFetch).toHaveBeenCalledWith({ owner: "vercel", repo: "next.js" });
  });

  it.each([
    ["an invalid owner", "-bad", "repo"],
    ["a dot-dot repo", "owner", ".."],
    ["a repo with spaces", "owner", "re po"],
  ])("returns 400 INVALID_REPO for %s without calling GitHub", async (_label, owner, repo) => {
    const response = await call(owner, repo);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REPO");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns 404 REPO_NOT_FOUND", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("REPO_NOT_FOUND"));
    const response = await call();
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("REPO_NOT_FOUND");
  });

  it("returns 429 with Retry-After for a rate limit", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("RATE_LIMITED", { retryAfterSeconds: 45 }));
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
  });

  it("hides the details of an unexpected error", async () => {
    mockedFetch.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5 password=hunter2"));
    const response = await call();
    const text = JSON.stringify(await response.json());
    expect(response.status).toBe(500);
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("10.0.0.5");
  });
});
