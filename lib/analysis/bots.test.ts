import { describe, expect, it } from "vitest";
import { excludeBots, isBotAuthor } from "./bots";

const author = (name: string, login: string | null = null) => ({ name, login });

describe("isBotAuthor", () => {
  it.each([
    ["a bot login", author("Dependabot", "dependabot[bot]")],
    ["a bot git name with no login", author("renovate[bot]")],
    ["a bot name with a human-looking login", author("github-actions[bot]", "someone")],
    ["different casing", author("Dependabot[BOT]")],
  ])("detects %s", (_label, who) => {
    expect(isBotAuthor(who)).toBe(true);
  });

  it.each([
    ["an ordinary person", author("Alice Smith", "alice")],
    ["a name containing the word bot", author("Botond Nagy", "botond")],
    ["a login that merely starts with bot", author("Bot Smith", "botsmith")],
    ["[bot] that is not at the end", author("[bot] helper", "helper")],
    ["no login at all", author("Unknown")],
  ])("does not flag %s", (_label, who) => {
    expect(isBotAuthor(who)).toBe(false);
  });
});

describe("excludeBots", () => {
  const commits = [
    { id: 1, author: author("Alice", "alice") },
    { id: 2, author: author("dependabot[bot]", "dependabot[bot]") },
    { id: 3, author: author("Bob", "bob") },
  ];

  it("removes bot commits and keeps the order of the rest", () => {
    expect(excludeBots(commits).map((commit) => commit.id)).toEqual([1, 3]);
  });

  it("returns a new array and leaves the input alone", () => {
    const result = excludeBots(commits);
    expect(result).not.toBe(commits);
    expect(commits).toHaveLength(3);
  });

  it("handles an empty list and a list of only bots", () => {
    expect(excludeBots([])).toEqual([]);
    expect(excludeBots([commits[1]])).toEqual([]);
  });
});
