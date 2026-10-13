import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubApiError } from "@/lib/github/errors";

vi.mock("@/lib/github/commits", () => ({ fetchCommitPage: vi.fn() }));

import { GET } from "@/app/api/repo/[owner]/[repo]/commits/route";
import { fetchCommitPage } from "@/lib/github/commits";

const mockedFetch = vi.mocked(fetchCommitPage);

const call = (query = "", owner = "vercel", repo = "next.js") =>
  GET(new Request(`http://localhost/api/repo/${owner}/${repo}/commits${query}`), {
    params: Promise.resolve({ owner, repo }),
  });

const page = { commits: [], nextCursor: null, totalCount: 0 };

describe("GET /api/repo/[owner]/[repo]/commits", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns commits in the success envelope", async () => {
    mockedFetch.mockResolvedValue({ ...page, totalCount: 5 });
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success", data: { ...page, totalCount: 5 }, message: "Commits loaded" });
  });

  it("defaults to 100 commits and no cursor", async () => {
    mockedFetch.mockResolvedValue(page);
    await call();
    expect(mockedFetch).toHaveBeenCalledWith({ owner: "vercel", repo: "next.js", cursor: null, limit: 100 });
  });

  it("passes a valid cursor and limit through", async () => {
    mockedFetch.mockResolvedValue(page);
    await call(`?cursor=${encodeURIComponent(`${"a".repeat(40)} 99`)}&limit=25`);
    expect(mockedFetch).toHaveBeenCalledWith({
      owner: "vercel",
      repo: "next.js",
      cursor: `${"a".repeat(40)} 99`,
      limit: 25,
    });
  });

  it.each([
    ["an invalid owner", "-bad", "repo"],
    ["a dotted owner", "own.er", "repo"],
    ["a dot-dot repo", "owner", ".."],
    ["a repo with spaces", "owner", "re po"],
  ])("returns 400 INVALID_REPO for %s", async (_label, owner, repo) => {
    const response = await call("", owner, repo);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REPO");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["limit above the maximum", "?limit=101"],
    ["limit of zero", "?limit=0"],
    ["a negative limit", "?limit=-5"],
    ["a non-numeric limit", "?limit=abc"],
    ["a fractional limit", "?limit=1.5"],
    ["an empty limit", "?limit="],
    ["a cursor with illegal characters", "?cursor=%3Cscript%3E"],
    ["an overlong cursor", `?cursor=${"a".repeat(201)}`],
  ])("returns 400 INVALID_REQUEST for %s", async (_label, query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_REQUEST");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("accepts the maximum limit of 100", async () => {
    mockedFetch.mockResolvedValue(page);
    expect((await call("?limit=100")).status).toBe(200);
  });

  it("returns 404 REPO_NOT_FOUND", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("REPO_NOT_FOUND"));
    const response = await call();
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("REPO_NOT_FOUND");
  });

  it("returns 429 with Retry-After for a rate limit", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("RATE_LIMITED", { retryAfterSeconds: 90 }));
    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect((await response.json()).error).toMatchObject({ code: "RATE_LIMITED", retryAfterSeconds: 90 });
  });

  it("returns 502 for an upstream failure", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("UPSTREAM_ERROR"));
    expect((await call()).status).toBe(502);
  });

  it("hides the details of an unexpected error behind INTERNAL_ERROR with a request id", async () => {
    mockedFetch.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"));
    const response = await call();
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });

  it("logs the failure with the request id but without the secret-bearing request", async () => {
    mockedFetch.mockRejectedValue(new GithubApiError("UPSTREAM_ERROR"));
    const response = await call();
    const { requestId } = await response.json();
    const logged = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(JSON.parse(logged)).toMatchObject({ requestId, code: "UPSTREAM_ERROR", repo: "vercel/next.js" });
  });
});
