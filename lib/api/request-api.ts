import type { ZodType } from "zod";
import type { ApiErrorCode } from "@/lib/github/errors";
import { apiErrorSchema, successEnvelopeSchema } from "./envelope";

const REQUEST_TIMEOUT_MS = 20_000;
const BAD_RESPONSE_MESSAGE = "The server sent an unexpected response. Please try again.";

export type ClientErrorCode = ApiErrorCode | "NETWORK_ERROR" | "TIMEOUT" | "BAD_RESPONSE";

export class ApiClientError extends Error {
  readonly code: ClientErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: ClientErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const NON_RETRYABLE_CODES: ReadonlySet<ClientErrorCode> = new Set([
  "INVALID_REPO",
  "INVALID_REQUEST",
  "REPO_NOT_FOUND",
  // An instant automatic retry would only spend the allowance again; the reader retries by hand.
  "TOO_MANY_REQUESTS",
]);

/** Retrying a bad input, a missing repository or an exhausted allowance straight away can never succeed. */
export function isRetryableError(error: unknown): boolean {
  return !(error instanceof ApiClientError && NON_RETRYABLE_CODES.has(error.code));
}

/** Calls one of our API routes and returns its validated `data`, or throws an ApiClientError. */
export async function requestApi<T>(url: string, dataSchema: ZodType<T>, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, { signal: combinedSignal });
  } catch (error) {
    // The caller navigated away or the query was cancelled: not a failure to report.
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new ApiClientError("TIMEOUT", "The request took too long. Please try again.");
    }
    throw new ApiClientError("NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError("BAD_RESPONSE", BAD_RESPONSE_MESSAGE);
  }

  if (response.ok) {
    const success = successEnvelopeSchema(dataSchema).safeParse(body);
    if (!success.success) throw new ApiClientError("BAD_RESPONSE", BAD_RESPONSE_MESSAGE);
    return success.data.data;
  }

  const failure = apiErrorSchema.safeParse(body);
  if (!failure.success) throw new ApiClientError("BAD_RESPONSE", BAD_RESPONSE_MESSAGE);
  throw new ApiClientError(failure.data.error.code, failure.data.message, failure.data.error.retryAfterSeconds);
}
