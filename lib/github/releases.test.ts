import { describe, expect, it } from "vitest";
import { GithubApiError } from "./errors";
import { mapReleases } from "./releases";

const node = (overrides: Record<string, unknown> = {}) => ({
  tagName: "v1.0.0",
  name: "Version 1.0.0",
  publishedAt: "2026-01-01T10:00:00Z",
  isPrerelease: false,
  isDraft: false,
  ...overrides,
});
const response = (nodes: unknown[]) => ({ repository: { releases: { nodes } } });

describe("mapReleases", () => {
  it("maps stable releases into our own shape", () => {
    expect(mapReleases(response([node()]))).toEqual({
      releases: [{ tag: "v1.0.0", name: "Version 1.0.0", publishedAt: "2026-01-01T10:00:00Z" }],
    });
  });

  it("falls back to the tag when a release has no name", () => {
    const { releases } = mapReleases(response([node({ name: null }), node({ name: "   ", tagName: "v2" })]));
    expect(releases.map((entry) => entry.name)).toEqual(["v1.0.0", "v2"]);
  });

  it("drops prereleases, drafts, unpublished releases and null entries", () => {
    const { releases } = mapReleases(
      response([
        node({ tagName: "stable" }),
        node({ tagName: "canary", isPrerelease: true }),
        node({ tagName: "draft", isDraft: true }),
        node({ tagName: "unpublished", publishedAt: null }),
        null,
      ]),
    );
    expect(releases.map((entry) => entry.tag)).toEqual(["stable"]);
  });

  it("returns an empty list for a repository without releases", () => {
    expect(mapReleases(response([]))).toEqual({ releases: [] });
  });

  it("throws REPO_NOT_FOUND when the repository is missing", () => {
    expect(() => mapReleases({ repository: null })).toThrow(expect.objectContaining({ code: "REPO_NOT_FOUND" }));
  });

  it.each([
    ["a non-object", "nope"],
    ["missing releases", { repository: {} }],
    ["a wrongly typed field", response([node({ isPrerelease: "no" })])],
  ])("rejects %s as an upstream error", (_label, raw) => {
    expect(() => mapReleases(raw)).toThrow(GithubApiError);
    expect(() => mapReleases(raw)).toThrow(expect.objectContaining({ code: "UPSTREAM_ERROR" }));
  });
});
