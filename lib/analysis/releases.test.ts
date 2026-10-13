import { describe, expect, it } from "vitest";
import { MAX_RELEASE_MARKERS, placeReleases } from "./releases";
import { bucketCommits } from "./timeline";

const release = (tag: string, publishedAt: string) => ({ tag, name: tag, publishedAt });
const dayBuckets = (...days: string[]) => bucketCommits(days.map((day) => ({ committedAt: `${day}T12:00:00Z` })), "day");

describe("placeReleases", () => {
  it("puts a release on the day it was published", () => {
    const buckets = dayBuckets("2026-01-01", "2026-01-05");
    const { byBucket, inRangeCount, shownCount } = placeReleases(
      [release("v1", "2026-01-03T09:00:00Z")],
      buckets,
      "day",
    );
    expect([...byBucket.keys()]).toEqual(["2026-01-03"]);
    expect(byBucket.get("2026-01-03")?.[0].tag).toBe("v1");
    expect(inRangeCount).toBe(1);
    expect(shownCount).toBe(1);
  });

  it("ignores releases outside the charted period", () => {
    const buckets = dayBuckets("2026-01-10", "2026-01-12");
    const { byBucket, inRangeCount } = placeReleases(
      [release("old", "2025-12-31T00:00:00Z"), release("future", "2026-02-01T00:00:00Z")],
      buckets,
      "day",
    );
    expect(byBucket.size).toBe(0);
    expect(inRangeCount).toBe(0);
  });

  it("uses UTC days, so a late-evening release lands on the right day", () => {
    const buckets = dayBuckets("2026-01-01", "2026-01-03");
    const { byBucket } = placeReleases([release("v1", "2026-01-01T23:30:00-05:00")], buckets, "day");
    expect([...byBucket.keys()]).toEqual(["2026-01-02"]);
  });

  it("maps a release to its Monday-based week when grouped by week", () => {
    const buckets = bucketCommits([{ committedAt: "2026-01-05T00:00:00Z" }, { committedAt: "2026-01-19T00:00:00Z" }], "week");
    // 2026-01-11 is a Sunday, so it belongs to the week starting Monday 2026-01-05.
    const { byBucket } = placeReleases([release("v1", "2026-01-11T10:00:00Z")], buckets, "week");
    expect([...byBucket.keys()]).toEqual(["2026-01-05"]);
  });

  it("groups several releases in one bucket, oldest first", () => {
    const buckets = dayBuckets("2026-01-01", "2026-01-02");
    const { byBucket } = placeReleases(
      [release("v1.1", "2026-01-01T18:00:00Z"), release("v1.0", "2026-01-01T06:00:00Z")],
      buckets,
      "day",
    );
    expect(byBucket.get("2026-01-01")?.map((entry) => entry.tag)).toEqual(["v1.0", "v1.1"]);
  });

  it("skips releases with an invalid date", () => {
    const buckets = dayBuckets("2026-01-01", "2026-01-02");
    const { inRangeCount } = placeReleases([release("bad", "not a date")], buckets, "day");
    expect(inRangeCount).toBe(0);
  });

  it("returns nothing for no releases or no buckets", () => {
    expect(placeReleases([], dayBuckets("2026-01-01"), "day").byBucket.size).toBe(0);
    expect(placeReleases([release("v1", "2026-01-01T00:00:00Z")], [], "day").byBucket.size).toBe(0);
  });

  it("keeps only the most recent markers past the cap but still counts them all", () => {
    const days = Array.from({ length: MAX_RELEASE_MARKERS + 5 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `2026-02-${day}`;
    });
    const buckets = dayBuckets(days[0], days[days.length - 1]);
    const releases = days.map((day, index) => release(`v${index}`, `${day}T12:00:00Z`));
    const { byBucket, inRangeCount, shownCount } = placeReleases(releases, buckets, "day");
    expect(inRangeCount).toBe(MAX_RELEASE_MARKERS + 5);
    expect(shownCount).toBe(MAX_RELEASE_MARKERS);
    expect(byBucket.has(days[0])).toBe(false);
    expect(byBucket.has(days[days.length - 1])).toBe(true);
  });
});
