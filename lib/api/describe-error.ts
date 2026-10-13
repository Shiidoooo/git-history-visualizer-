import { formatRetryDelay } from "@/lib/format/display";
import { ApiClientError } from "./request-api";

export type ErrorDescription = {
  title: string;
  message: string;
  canRetry: boolean;
};

const GENERIC: ErrorDescription = {
  title: "Couldn't load commits",
  message: "Something went wrong. Please try again.",
  canRetry: true,
};

/** Turns a failure into what the reader sees. Messages come from our API, never from GitHub. */
export function describeError(error: unknown): ErrorDescription {
  if (!(error instanceof ApiClientError)) return GENERIC;

  switch (error.code) {
    case "REPO_NOT_FOUND":
      // GitHub reports private repositories as "not found" to a public-only token, so the copy covers both.
      return {
        title: "Repository not found",
        message: "It may not exist, or it may be private. Only public repositories are supported.",
        canRetry: false,
      };
    case "RATE_LIMITED": {
      const wait = error.retryAfterSeconds ? ` Try again in ${formatRetryDelay(error.retryAfterSeconds)}.` : "";
      return {
        title: "GitHub's rate limit was reached",
        message: `Too many requests have been made to GitHub.${wait}`,
        canRetry: true,
      };
    }
    case "TOO_MANY_REQUESTS": {
      const wait = error.retryAfterSeconds ? ` Try again in ${formatRetryDelay(error.retryAfterSeconds)}.` : "";
      return {
        title: "Too many requests",
        message: `You're loading repositories faster than we allow.${wait}`,
        canRetry: true,
      };
    }
    case "INVALID_REPO":
    case "INVALID_REQUEST":
      return { title: "That repository isn't valid", message: error.message, canRetry: false };
    default:
      return { title: GENERIC.title, message: error.message, canRetry: true };
  }
}
