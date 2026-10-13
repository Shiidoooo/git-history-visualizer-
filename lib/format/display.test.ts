import { describe, expect, it } from "vitest";
import { formatCompact, formatCount, formatDay, formatRetryDelay, pluralize } from "./display";

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

describe("formatCompact", () => {
  it("keeps small numbers and shortens large ones", () => {
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1500)).toBe("1.5K");
    expect(formatCompact(2_000_000)).toBe("2M");
  });
});

describe("formatDay", () => {
  it("formats a UTC day without a year by default", () => {
    expect(formatDay("2026-01-05")).toBe("Jan 5");
  });

  it("can include the year", () => {
    expect(formatDay("2026-01-05", { withYear: true })).toBe("Jan 5, 2026");
  });

  it("does not shift the day for timezones behind UTC", () => {
    expect(formatDay("2026-03-01")).toBe("Mar 1");
  });
});

describe("formatRetryDelay", () => {
  it.each([
    [1, "about a minute"],
    [60, "about a minute"],
    [61, "about 2 minutes"],
    [600, "about 10 minutes"],
  ])("formats %i seconds", (seconds, expected) => {
    expect(formatRetryDelay(seconds)).toBe(expected);
  });
});

describe("pluralize", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralize(1, "commit")).toBe("commit");
    expect(pluralize(0, "commit")).toBe("commits");
    expect(pluralize(2, "commit")).toBe("commits");
  });

  it("accepts an irregular plural", () => {
    expect(pluralize(2, "person", "people")).toBe("people");
  });
});
