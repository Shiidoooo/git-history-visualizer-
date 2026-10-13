import { describe, expect, it } from "vitest";
import { bucketCommits, suggestGranularity } from "./timeline";

const at = (iso: string) => ({ committedAt: iso });

describe("bucketCommits", () => {
  it("returns no buckets for no commits", () => {
    expect(bucketCommits([], "day")).toEqual([]);
  });

  it("counts commits per UTC day and fills gaps with zero", () => {
    const buckets = bucketCommits(
      [at("2026-01-01T01:00:00Z"), at("2026-01-01T23:59:59Z"), at("2026-01-04T12:00:00Z")],
      "day",
    );
    expect(buckets).toEqual([
      { start: "2026-01-01", count: 2 },
      { start: "2026-01-02", count: 0 },
      { start: "2026-01-03", count: 0 },
      { start: "2026-01-04", count: 1 },
    ]);
  });

  it("starts weeks on Monday", () => {
    // 2026-01-04 is a Sunday, 2026-01-05 a Monday.
    const buckets = bucketCommits([at("2026-01-04T10:00:00Z"), at("2026-01-05T10:00:00Z")], "week");
    expect(buckets).toEqual([
      { start: "2025-12-29", count: 1 },
      { start: "2026-01-05", count: 1 },
    ]);
  });

  it("fills empty weeks between commits", () => {
    const buckets = bucketCommits([at("2026-01-05T00:00:00Z"), at("2026-01-19T00:00:00Z")], "week");
    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 0, 1]);
  });

  it("buckets by UTC even when the offset crosses midnight", () => {
    const buckets = bucketCommits([at("2026-01-01T23:30:00-05:00")], "day");
    expect(buckets).toEqual([{ start: "2026-01-02", count: 1 }]);
  });

  it("skips commits with an invalid date", () => {
    expect(bucketCommits([at("not a date"), at("2026-01-01T00:00:00Z")], "day")).toEqual([
      { start: "2026-01-01", count: 1 },
    ]);
  });

  it("keeps the total count equal to the number of valid commits", () => {
    const commits = ["2026-01-01", "2026-01-09", "2026-02-14", "2026-02-14"].map((day) =>
      at(`${day}T08:00:00Z`),
    );
    const total = bucketCommits(commits, "week").reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).toBe(commits.length);
  });
});

describe("suggestGranularity", () => {
  it("suggests day for an empty list", () => {
    expect(suggestGranularity([])).toBe("day");
  });

  it("suggests day for a short history", () => {
    expect(suggestGranularity([at("2026-01-01T00:00:00Z"), at("2026-02-01T00:00:00Z")])).toBe("day");
  });

  it("suggests week once history passes about three months", () => {
    expect(suggestGranularity([at("2025-01-01T00:00:00Z"), at("2026-01-01T00:00:00Z")])).toBe("week");
  });

  it("treats exactly 90 days as still daily and 91 days as weekly", () => {
    expect(suggestGranularity([at("2026-01-01T00:00:00Z"), at("2026-04-01T00:00:00Z")])).toBe("day");
    expect(suggestGranularity([at("2026-01-01T00:00:00Z"), at("2026-04-02T00:00:00Z")])).toBe("week");
  });
});
