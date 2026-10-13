import { API_ERROR_MESSAGE, API_ERROR_STATUS, type ApiErrorCode } from "@/lib/github/errors";

export function jsonSuccess<T>(data: T, message = "OK"): Response {
  return Response.json({ status: "success", data, message });
}

export function jsonError(
  code: ApiErrorCode,
  requestId: string,
  options: { retryAfterSeconds?: number; details?: unknown[] } = {},
): Response {
  const headers = new Headers();
  if ((code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS") && options.retryAfterSeconds) {
    headers.set("Retry-After", String(options.retryAfterSeconds));
  }
  return Response.json(
    {
      status: "error",
      data: null,
      message: API_ERROR_MESSAGE[code],
      error: {
        code,
        details: options.details ?? [],
        ...(options.retryAfterSeconds ? { retryAfterSeconds: options.retryAfterSeconds } : {}),
      },
      requestId,
    },
    { status: API_ERROR_STATUS[code], headers },
  );
}
