import { Octokit } from "octokit";
import { getEnv } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(url, { ...init, signal });
}

let octokit: Octokit | undefined;

/** Server-side only: the token never leaves this process. */
export function getOctokit(): Octokit {
  octokit ??= new Octokit({
    auth: getEnv().GITHUB_TOKEN,
    userAgent: "git-history-visualizer",
    // A serverless function must not sleep through a rate limit; fail fast and report it instead.
    throttle: {
      onRateLimit: () => false,
      onSecondaryRateLimit: () => false,
    },
    retry: { retries: 1 },
    request: { fetch: fetchWithTimeout },
  });
  return octokit;
}
