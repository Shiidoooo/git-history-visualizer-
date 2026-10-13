import { isIP } from "node:net";

export const UNKNOWN_CLIENT = "unknown";

/**
 * The caller's IP address, used only as a rate-limit key.
 *
 * On Vercel the platform overwrites x-forwarded-for with the real client address, so its first
 * entry can be trusted there. Behind a proxy that appends instead, a client could spoof it.
 * Anything that is not a valid IP address becomes one shared "unknown" bucket, which also keeps
 * arbitrary header text out of Redis keys.
 */
export function getClientIp(headers: Headers): string {
  const candidate = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : UNKNOWN_CLIENT;
}
