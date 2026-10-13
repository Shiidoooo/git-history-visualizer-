import { describe, expect, it } from "vitest";
import { parseRepoInput } from "./repo-ref";

const ok = (owner: string, repo: string) => ({ ok: true, ref: { owner, repo } });

describe("parseRepoInput", () => {
  it.each([
    ["vercel/next.js", ok("vercel", "next.js")],
    ["  vercel/next.js  ", ok("vercel", "next.js")],
    ["https://github.com/vercel/next.js", ok("vercel", "next.js")],
    ["http://www.github.com/vercel/next.js/", ok("vercel", "next.js")],
    ["github.com/vercel/next.js", ok("vercel", "next.js")],
    ["https://github.com/vercel/next.js.git", ok("vercel", "next.js")],
    ["https://github.com/vercel/next.js/tree/canary/packages", ok("vercel", "next.js")],
    ["https://github.com/vercel/next.js?tab=readme#top", ok("vercel", "next.js")],
    ["a/b", ok("a", "b")],
    ["my-org/my_repo.v2", ok("my-org", "my_repo.v2")],
  ])("accepts %s", (input, expected) => {
    expect(parseRepoInput(input)).toEqual(expected);
  });

  it.each([
    "",
    "   ",
    "vercel",
    "vercel/",
    "/next.js",
    "vercel/next.js/extra",
    "vercel//next.js",
    "-bad/repo",
    "bad-/repo",
    "bad_owner/repo",
    "owner/re po",
    "owner/..",
    "owner/.",
    "owner/repo<script>",
    "owner/repo%2F..",
  ])("rejects %j", (input) => {
    expect(parseRepoInput(input).ok).toBe(false);
  });

  it("rejects other hosts and schemes", () => {
    for (const input of [
      "https://gitlab.com/owner/repo",
      "https://evil.com/github.com/owner/repo",
      "git@github.com:owner/repo",
      "javascript:alert(1)",
      "ftp://github.com/owner/repo",
    ]) {
      const result = parseRepoInput(input);
      expect(result.ok, input).toBe(false);
    }
  });

  it("rejects an owner longer than 39 characters", () => {
    expect(parseRepoInput(`${"a".repeat(40)}/repo`).ok).toBe(false);
    expect(parseRepoInput(`${"a".repeat(39)}/repo`).ok).toBe(true);
  });

  it("rejects a repo longer than 100 characters", () => {
    expect(parseRepoInput(`owner/${"r".repeat(101)}`).ok).toBe(false);
    expect(parseRepoInput(`owner/${"r".repeat(100)}`).ok).toBe(true);
  });

  it("rejects overlong input before parsing it", () => {
    const result = parseRepoInput(`https://github.com/owner/repo/${"x".repeat(400)}`);
    expect(result.ok).toBe(false);
  });

  it("returns a hint for bad input", () => {
    const result = parseRepoInput("nope");
    expect(result).toEqual({ ok: false, message: expect.stringContaining("owner/repo") });
  });
});
