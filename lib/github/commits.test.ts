import { describe, expect, it } from "vitest";
import { commitsPageSchema } from "@/lib/api/commits-contract";
import { mapCommitHistory } from "./commits";
import { GithubApiError } from "./errors";

type NodeOverrides = Record<string, unknown>;

const node = (overrides: NodeOverrides = {}) => ({
  oid: "a".repeat(40),
  committedDate: "2026-01-01T10:00:00Z",
  messageHeadline: "Fix the thing",
  additions: 10,
  deletions: 2,
  changedFilesIfAvailable: 3,
  author: { name: "Alice", user: { login: "alice" } },
  ...overrides,
});

const response = (
  nodes: unknown[],
  pageInfo = { hasNextPage: false, endCursor: null as string | null },
  totalCount = nodes.length,
) => ({
  repository: { defaultBranchRef: { target: { history: { totalCount, pageInfo, nodes } } } },
});

describe("mapCommitHistory", () => {
  it("maps commits into our own shape", () => {
    const page = mapCommitHistory(response([node()]));
    expect(page.commits).toEqual([
      {
        sha: "a".repeat(40),
        committedAt: "2026-01-01T10:00:00Z",
        message: "Fix the thing",
        additions: 10,
        deletions: 2,
        changedFiles: 3,
        author: { name: "Alice", login: "alice" },
      },
    ]);
    expect(commitsPageSchema.safeParse(page).success).toBe(true);
  });

  it("returns the next cursor only when more pages exist", () => {
    const more = mapCommitHistory(response([node()], { hasNextPage: true, endCursor: "abc 99" }, 250));
    expect(more.nextCursor).toBe("abc 99");
    expect(more.totalCount).toBe(250);

    const last = mapCommitHistory(response([node()], { hasNextPage: false, endCursor: "abc 99" }));
    expect(last.nextCursor).toBeNull();
  });

  it("returns an empty page for a repository with no default branch", () => {
    expect(mapCommitHistory({ repository: { defaultBranchRef: null } })).toEqual({
      commits: [],
      nextCursor: null,
      totalCount: 0,
    });
  });

  it("returns an empty page when the default branch has no commit target", () => {
    expect(mapCommitHistory({ repository: { defaultBranchRef: { target: null } } }).commits).toEqual([]);
  });

  it("throws REPO_NOT_FOUND when the repository is missing", () => {
    expect(() => mapCommitHistory({ repository: null })).toThrow(
      expect.objectContaining({ code: "REPO_NOT_FOUND" }),
    );
  });

  it("falls back to the login, then to Unknown, when the author has no name", () => {
    const page = mapCommitHistory(
      response([
        node({ author: { name: null, user: { login: "ghost" } } }),
        node({ author: { name: null, user: null } }),
        node({ author: null }),
      ]),
    );
    expect(page.commits.map((commit) => commit.author)).toEqual([
      { name: "ghost", login: "ghost" },
      { name: "Unknown", login: null },
      { name: "Unknown", login: null },
    ]);
  });

  it("keeps changedFiles null when GitHub does not provide it", () => {
    const page = mapCommitHistory(response([node({ changedFilesIfAvailable: null })]));
    expect(page.commits[0].changedFiles).toBeNull();
  });

  it.each([
    ["a non-object", "nope"],
    ["missing history fields", { repository: { defaultBranchRef: { target: { history: {} } } } }],
    ["a negative count", response([node({ additions: -1 })])],
    ["a wrongly typed field", response([node({ oid: 123 })])],
  ])("rejects %s as an upstream error", (_label, raw) => {
    expect(() => mapCommitHistory(raw)).toThrow(GithubApiError);
    expect(() => mapCommitHistory(raw)).toThrow(expect.objectContaining({ code: "UPSTREAM_ERROR" }));
  });
});
