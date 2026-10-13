const fullNumber = new Intl.NumberFormat("en");
const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(value: number): string {
  return fullNumber.format(value);
}

/** 999 stays 999, 1,500 becomes 1.5K. For axis ticks and tight spaces. */
export function formatCompact(value: number): string {
  return compactNumber.format(value);
}

/** Formats a YYYY-MM-DD day, always in UTC so the label matches the bucket it came from. */
export function formatDay(isoDay: string, options: { withYear?: boolean } = {}): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: options.withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(`${isoDay}T00:00:00Z`));
}

export function formatRetryDelay(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "about a minute" : `about ${minutes} minutes`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
