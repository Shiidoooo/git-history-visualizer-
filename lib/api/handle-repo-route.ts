import { randomUUID } from "node:crypto";
import { GithubApiError } from "@/lib/github/errors";
import { repoRefSchema, type RepoRef } from "@/lib/github/repo-ref";
import { jsonError } from "./respond";

export type RepoRouteContext = {
  repo: RepoRef;
  searchParams: URLSearchParams;
  requestId: string;
};

/**
 * The shared shell of every /api/repo/[owner]/[repo]/* route: request id, owner/repo validation,
 * and one place that turns any failure into a safe error response. Routes only supply `run`.
 */
export async function handleRepoRoute(
  request: Request,
  params: Promise<{ owner: string; repo: string }>,
  run: (context: RepoRouteContext) => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();

  const repoRef = repoRefSchema.safeParse(await params);
  if (!repoRef.success) {
    return jsonError("INVALID_REPO", requestId);
  }

  try {
    return await run({
      repo: repoRef.data,
      searchParams: new URL(request.url).searchParams,
      requestId,
    });
  } catch (error) {
    const apiError =
      error instanceof GithubApiError ? error : new GithubApiError("INTERNAL_ERROR", { cause: error });
    // Details stay in the server log; the client only gets the safe message and the requestId.
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        code: apiError.code,
        repo: `${repoRef.data.owner}/${repoRef.data.repo}`,
        cause: apiError.cause instanceof Error ? apiError.cause.message : undefined,
      }),
    );
    return jsonError(apiError.code, requestId, { retryAfterSeconds: apiError.retryAfterSeconds });
  }
}
