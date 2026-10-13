import { describe, expect, it } from "vitest";
import { classifyCommitMessage, countCommitTypes, COMMIT_TYPES } from "./commit-types";

describe("classifyCommitMessage", () => {
  it.each([
    ["feat: add dark mode", "feat"],
    ["fix: crash on empty repo", "fix"],
    ["fix(turbopack): handle symlinks", "fix"],
    ["feat(api)!: drop v1 endpoints", "feat"],
    ["Docs: update readme", "docs"],
    ["DOCS(readme): typo", "docs"],
    ["perf: faster parsing", "perf"],
    ["refactor(core): split module", "refactor"],
    ["test: cover edge case", "test"],
    ["tests: more coverage", "test"],
    ["build: bump bundler", "build"],
    ["ci: cache dependencies", "ci"],
    ["style: format files", "style"],
    ["chore: update lockfile", "chore"],
    ["feature: new chart", "feat"],
    ["bugfix: wrong total", "fix"],
    ["revert: undo change", "revert"],
  ])("reads the conventional prefix in %j as %s", (message, expected) => {
    expect(classifyCommitMessage(message)).toBe(expected);
  });

  it.each([
    ["Merge pull request #12 from user/branch", "merge"],
    ["Merge branch 'main' into feature", "merge"],
    ["merge remote-tracking branch", "merge"],
    ['Revert "Add a thing"', "revert"],
    ["Fix the login redirect", "fix"],
    ["Fixes a memory leak", "fix"],
    ["Fixed typo", "fix"],
  ])("recognizes the plain wording in %j as %s", (message, expected) => {
    expect(classifyCommitMessage(message)).toBe(expected);
  });

  it.each([
    "Update dependencies",
    "Add support for tags",
    "wip",
    "",
    "   ",
    "Merged the thing",
    "Merge-sort optimization",
    "Fixup! earlier change",
    "unknown: something",
    "Prefix fix: not at the start",
  ])("does not guess for %j", (message) => {
    expect(classifyCommitMessage(message)).toBe("other");
  });

  it("ignores surrounding whitespace", () => {
    expect(classifyCommitMessage("   fix: padded  ")).toBe("fix");
  });
});

describe("countCommitTypes", () => {
  it("returns nothing for no commits", () => {
    expect(countCommitTypes([])).toEqual([]);
  });

  it("counts per type, biggest first, and leaves out empty types", () => {
    const counts = countCommitTypes([
      { message: "fix: a" },
      { message: "feat: b" },
      { message: "fix: c" },
      { message: "Update stuff" },
    ]);
    expect(counts).toEqual([
      { type: "fix", label: "Fixes", count: 2 },
      { type: "feat", label: "Features", count: 1 },
      { type: "other", label: "Other", count: 1 },
    ]);
  });

  it("breaks ties in the fixed display order", () => {
    const counts = countCommitTypes([{ message: "docs: a" }, { message: "feat: b" }, { message: "chore: c" }]);
    expect(counts.map((entry) => entry.type)).toEqual(["feat", "docs", "chore"]);
  });

  it("accounts for every commit", () => {
    const messages = ["fix: a", "x", "Merge pull request #1", "feat: b", "Revert \"x\"", "docs: y", "x"];
    const total = countCommitTypes(messages.map((message) => ({ message }))).reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    expect(total).toBe(messages.length);
  });

  it("only ever reports known types", () => {
    const types = countCommitTypes([{ message: "weird: thing" }, { message: "feat: ok" }]).map(
      (entry) => entry.type,
    );
    for (const type of types) expect(COMMIT_TYPES).toContain(type);
  });
});
