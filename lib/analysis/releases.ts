import { bucketStartDay, type TimelineBucket, type TimelineGranularity } from "./timeline";

type ReleaseInput = { tag: string; name: string; publishedAt: string };

// Past this many markers the timeline turns into a barcode, so only the most recent are drawn.
export const MAX_RELEASE_MARKERS = 20;

export type ReleaseMarkers<T> = {
  /** Releases to draw, keyed by the timeline bucket they fall in (oldest first within a bucket). */
  byBucket: Map<string, T[]>;
  /** Releases that fall inside the charted period. */
  inRangeCount: number;
  shownCount: number;
};

/** Places releases on the timeline's buckets. Releases outside the charted period are ignored. */
export function placeReleases<T extends ReleaseInput>(
  releases: readonly T[],
  buckets: readonly TimelineBucket[],
  granularity: TimelineGranularity,
): ReleaseMarkers<T> {
  const bucketStarts = new Set(buckets.map((bucket) => bucket.start));
  const inRange = new Map<string, T[]>();
  let inRangeCount = 0;

  const oldestFirst = [...releases].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  for (const release of oldestFirst) {
    const publishedAt = new Date(release.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) continue;
    const start = bucketStartDay(publishedAt, granularity);
    if (!bucketStarts.has(start)) continue;
    inRangeCount += 1;
    const inBucket = inRange.get(start);
    if (inBucket) inBucket.push(release);
    else inRange.set(start, [release]);
  }

  const recentBucketStarts = [...inRange.keys()].sort().slice(-MAX_RELEASE_MARKERS);
  const byBucket = new Map(recentBucketStarts.map((start) => [start, inRange.get(start) ?? []] as const));
  const shownCount = [...byBucket.values()].reduce((total, list) => total + list.length, 0);
  return { byBucket, inRangeCount, shownCount };
}
