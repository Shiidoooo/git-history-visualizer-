import { GithubApiError } from "./errors";

const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MAX_RETRY_AFTER_SECONDS = 3600;

type MaybeGithubError = {
  name?: unknown;
  status?: unknown;
  message?: unknown;
  errors?: unknown;
  headers?: unknown;
  response?: { headers?: unknown };
};

function readHeader(error: MaybeGithubError, name: string): string | undefined {
  const headers = (error.headers ?? error.response?.headers) as Record<string, unknown> | undefined;
  const value = headers?.[name];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function graphqlErrorTypes(error: MaybeGithubError): string[] {
  if (!Array.isArray(error.errors)) return [];
  return error.errors.flatMap((entry: unknown) =>
    typeof entry === "object" && entry !== null && typeof (entry as { type?: unknown }).type === "string"
      ? [(entry as { type: string }).type]
      : [],
  );
}

function retryAfterSeconds(error: MaybeGithubError, now: Date): number {
  const retryAfter = Number(readHeader(error, "retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(Math.ceil(retryAfter), MAX_RETRY_AFTER_SECONDS);
  }
  const resetEpoch = Number(readHeader(error, "x-ratelimit-reset"));
  if (Number.isFinite(resetEpoch) && resetEpoch > 0) {
    const seconds = Math.ceil(resetEpoch - now.getTime() / 1000);
    return Math.min(Math.max(seconds, 1), MAX_RETRY_AFTER_SECONDS);
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}

function isRateLimited(error: MaybeGithubError, types: string[]): boolean {
  if (types.includes("RATE_LIMITED")) return true;
  if (error.status === 429) return true;
  if (error.status === 403) {
    return (
      readHeader(error, "x-ratelimit-remaining") === "0" ||
      readHeader(error, "retry-after") !== undefined ||
      (typeof error.message === "string" && /rate limit/i.test(error.message))
    );
  }
  return false;
}

/**
 * Maps an Octokit failure to one of our safe error codes. Uses duck-typing so it works for
 * RequestError, GraphqlResponseError and timeouts alike. GitHub reports private repositories
 * as NOT_FOUND to a public-only token, so the two cannot be told apart.
 */
export function classifyGithubError(error: unknown, now: Date = new Date()): GithubApiError {
  if (error instanceof GithubApiError) return error;

  const candidate: MaybeGithubError = typeof error === "object" && error !== null ? error : {};
  const types = graphqlErrorTypes(candidate);

  if (isRateLimited(candidate, types)) {
    return new GithubApiError("RATE_LIMITED", {
      retryAfterSeconds: retryAfterSeconds(candidate, now),
      cause: error,
    });
  }
  if (types.includes("NOT_FOUND") || candidate.status === 404) {
    return new GithubApiError("REPO_NOT_FOUND", { cause: error });
  }
  return new GithubApiError("UPSTREAM_ERROR", { cause: error });
}
