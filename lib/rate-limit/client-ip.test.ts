import { describe, expect, it } from "vitest";
import { getClientIp, UNKNOWN_CLIENT } from "./client-ip";

const headers = (init: Record<string, string>) => new Headers(init);

describe("getClientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("accepts IPv6 addresses", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("returns the shared unknown bucket when no header is present", () => {
    expect(getClientIp(headers({}))).toBe(UNKNOWN_CLIENT);
  });

  it.each(["not-an-ip", "999.1.1.1", "203.0.113.7:8080", "<script>", "a".repeat(500)])(
    "does not use %s as a key",
    (value) => {
      expect(getClientIp(headers({ "x-forwarded-for": value }))).toBe(UNKNOWN_CLIENT);
    },
  );

  it("ignores a blank first entry's whitespace", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });
});
