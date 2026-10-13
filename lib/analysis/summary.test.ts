import { describe, expect, it } from "vitest";
import { summarizeCommits } from "./summary";

const commit = (committedAt: string, login: string | null, additions = 0, deletions = 0) => ({
  committedAt,
  additions,
  deletions,
  author: { name: login ?? "anon", login },
});

describe("summarizeCommits", () => {
  it("summarizes an empty list without inventing dates", () => {
    expect(summarizeCommits([])).toEqual({
      commitCount: 0,
      contributorCount: 0,
      firstDay: null,
      lastDay: null,
      additions: 0,
      deletions: 0,
    });
  });

  it("counts commits, contributors and line changes", () => {
    const summary = summarizeCommits([
      commit("2026-01-03T00:00:00Z", "a", 10, 1),
      commit("2026-01-01T00:00:00Z", "b", 5, 2),
      commit("2026-01-02T00:00:00Z", "a", 1, 1),
    ]);
    expect(summary).toMatchObject({
      commitCount: 3,
      contributorCount: 2,
      additions: 16,
      deletions: 4,
      firstDay: "2026-01-01",
      lastDay: "2026-01-03",
    });
  });

  it("ignores invalid dates when finding the range but still counts the commit", () => {
    const summary = summarizeCommits([commit("garbage", "a"), commit("2026-02-01T00:00:00Z", "a")]);
    expect(summary).toMatchObject({ commitCount: 2, firstDay: "2026-02-01", lastDay: "2026-02-01" });
  });

  it("returns null dates when no commit has a valid date", () => {
    expect(summarizeCommits([commit("garbage", "a")])).toMatchObject({ firstDay: null, lastDay: null });
  });
});
