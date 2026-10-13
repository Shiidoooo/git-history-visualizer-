export const API_ERROR_CODES = [
  "INVALID_REPO",
  "INVALID_REQUEST",
  "REPO_NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  INVALID_REPO: 400,
  INVALID_REQUEST: 400,
  REPO_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

// Safe to show to users: never includes GitHub's raw error text.
export const API_ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  INVALID_REPO: "Enter a valid GitHub repository, for example vercel/next.js.",
  INVALID_REQUEST: "The request was not valid.",
  REPO_NOT_FOUND:
    "Repository not found. It may not exist, or it may be private (only public repositories are supported).",
  RATE_LIMITED: "GitHub's rate limit was reached. Please try again later.",
  UPSTREAM_ERROR: "GitHub is not responding right now. Please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

export class GithubApiError extends Error {
  readonly code: ApiErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ApiErrorCode,
    options: { retryAfterSeconds?: number; cause?: unknown; detail?: string } = {},
  ) {
    super(options.detail ?? API_ERROR_MESSAGE[code], { cause: options.cause });
    this.name = "GithubApiError";
    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
