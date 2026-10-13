export type TimelineGranularity = "day" | "week";

export type TimelineBucket = {
  /** First day of the bucket as YYYY-MM-DD in UTC. Weeks start on Monday. */
  start: string;
  count: number;
};

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
// Past roughly three months of history, one bar per day gets too thin to read.
const MAX_DAILY_SPAN_DAYS = 90;

function startOfBucket(date: Date, granularity: TimelineGranularity): number {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (granularity === "day") return midnight;
  const daysSinceMonday = (date.getUTCDay() + 6) % DAYS_PER_WEEK;
  return midnight - daysSinceMonday * MS_PER_DAY;
}

function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The bucket (as YYYY-MM-DD in UTC) that a moment falls into. */
export function bucketStartDay(date: Date, granularity: TimelineGranularity): string {
  return toDay(startOfBucket(date, granularity));
}

/** Counts commits per day or week and fills quiet gaps with zero-count buckets. */
export function bucketCommits(
  commits: readonly { committedAt: string }[],
  granularity: TimelineGranularity,
): TimelineBucket[] {
  const counts = new Map<number, number>();
  for (const commit of commits) {
    const date = new Date(commit.committedAt);
    if (Number.isNaN(date.getTime())) continue;
    const start = startOfBucket(date, granularity);
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const starts = [...counts.keys()];
  const first = Math.min(...starts);
  const last = Math.max(...starts);
  const step = (granularity === "day" ? 1 : DAYS_PER_WEEK) * MS_PER_DAY;

  const buckets: TimelineBucket[] = [];
  for (let start = first; start <= last; start += step) {
    buckets.push({ start: toDay(start), count: counts.get(start) ?? 0 });
  }
  return buckets;
}

export function suggestGranularity(commits: readonly { committedAt: string }[]): TimelineGranularity {
  const times = commits.map((commit) => new Date(commit.committedAt).getTime()).filter(Number.isFinite);
  if (times.length === 0) return "day";
  const spanDays = (Math.max(...times) - Math.min(...times)) / MS_PER_DAY;
  return spanDays > MAX_DAILY_SPAN_DAYS ? "week" : "day";
}
