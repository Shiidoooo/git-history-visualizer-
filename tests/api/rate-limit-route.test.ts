import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/github/commits", () => ({
  fetchCommitPage: vi.fn().mockResolvedValue({ commits: [], nextCursor: null, totalCount: 0 }),
}));

// The real limiter keeps its counts at module level, so each test gets a fresh copy of the modules.
async function loadRoute() {
  vi.resetModules();
  const { GET } = await import("@/app/api/repo/[owner]/[repo]/commits/route");
  const { fetchCommitPage } = await import("@/lib/github/commits");
  return { GET, fetchCommitPage: vi.mocked(fetchCommitPage) };
}

const callAs = (GET: Awaited<ReturnType<typeof loadRoute>>["GET"], ip: string, path = "vercel/next.js") => {
  const [owner, repo] = path.split("/");
  return GET(
    new Request(`http://localhost/api/repo/${path}/commits`, { headers: { "x-forwarded-for": ip } }),
    { params: Promise.resolve({ owner, repo }) },
  );
};

describe("rate limiting on /api/repo routes", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("allows 30 requests a minute and answers the 31st with 429", async () => {
    const { GET, fetchCommitPage } = await loadRoute();
    for (let i = 0; i < 30; i++) {
      expect((await callAs(GET, "203.0.113.7")).status).toBe(200);
    }

    const response = await callAs(GET, "203.0.113.7");
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      status: "error",
      data: null,
      error: { code: "TOO_MANY_REQUESTS" },
    });
    expect(body.requestId).toEqual(expect.any(String));
    expect(fetchCommitPage).toHaveBeenCalledTimes(30);
  });

  it("sends a Retry-After header that matches the body", async () => {
    const { GET } = await loadRoute();
    for (let i = 0; i < 30; i++) await callAs(GET, "203.0.113.7");

    const response = await callAs(GET, "203.0.113.7");
    const retryAfter = Number(response.headers.get("Retry-After"));

    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect((await response.json()).error.retryAfterSeconds).toBe(retryAfter);
  });

  it("limits each client on its own", async () => {
    const { GET } = await loadRoute();
    for (let i = 0; i < 31; i++) await callAs(GET, "203.0.113.7");

    expect((await callAs(GET, "203.0.113.8")).status).toBe(200);
  });

  it("counts malformed requests too, and never reaches GitHub for them", async () => {
    const { GET, fetchCommitPage } = await loadRoute();
    for (let i = 0; i < 30; i++) {
      expect((await callAs(GET, "203.0.113.7", "-bad/repo")).status).toBe(400);
    }

    expect((await callAs(GET, "203.0.113.7", "-bad/repo")).status).toBe(429);
    expect(fetchCommitPage).not.toHaveBeenCalled();
  });

  it("does not let a spoofed header value create a fresh allowance", async () => {
    const { GET } = await loadRoute();
    for (let i = 0; i < 30; i++) await callAs(GET, "not-an-ip");

    // Every invalid value lands in the same shared bucket instead of getting its own.
    expect((await callAs(GET, "also-not-an-ip")).status).toBe(429);
  });
});
