import { describe, expect, it } from "vitest";
import { rankContributors } from "./authors";

const commit = (name: string, login: string | null, additions = 0, deletions = 0) => ({
  additions,
  deletions,
  author: { name, login },
});

describe("rankContributors", () => {
  it("returns an empty list for no commits", () => {
    expect(rankContributors([])).toEqual([]);
  });

  it("groups by login even when the git name differs", () => {
    const ranked = rankContributors([commit("Alice A", "alice"), commit("alice", "alice")]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ name: "alice", commits: 2 });
  });

  it("falls back to the git name when there is no login", () => {
    const ranked = rankContributors([commit("Bob", null), commit("Bob", null)]);
    expect(ranked).toEqual([
      { key: "name:Bob", name: "Bob", commits: 2, additions: 0, deletions: 0 },
    ]);
  });

  it("keeps a login and a same-named anonymous author separate", () => {
    const ranked = rankContributors([commit("sam", "sam"), commit("sam", null)]);
    expect(ranked).toHaveLength(2);
  });

  it("sums additions and deletions per author", () => {
    const ranked = rankContributors([commit("A", "a", 10, 2), commit("A", "a", 5, 1)]);
    expect(ranked[0]).toMatchObject({ additions: 15, deletions: 3 });
  });

  it("sorts by commits descending and breaks ties by name", () => {
    const ranked = rankContributors([
      commit("zed", "zed"),
      commit("amy", "amy"),
      commit("top", "top"),
      commit("top", "top"),
    ]);
    expect(ranked.map((entry) => entry.name)).toEqual(["top", "amy", "zed"]);
  });
});
