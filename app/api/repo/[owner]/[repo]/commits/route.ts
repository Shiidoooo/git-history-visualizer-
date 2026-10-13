import { z } from "zod";
import { MAX_COMMITS_PER_REQUEST } from "@/lib/api/commits-contract";
import { handleRepoRoute } from "@/lib/api/handle-repo-route";
import { jsonError, jsonSuccess } from "@/lib/api/respond";
import { fetchCommitPage } from "@/lib/github/commits";

// GitHub history cursors look like "<40-hex sha> <index>"; allow a conservative character set.
const CURSOR_PATTERN = /^[A-Za-z0-9 +/=_-]{1,200}$/;

const querySchema = z.object({
  cursor: z.string().regex(CURSOR_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_COMMITS_PER_REQUEST).default(MAX_COMMITS_PER_REQUEST),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
): Promise<Response> {
  return handleRepoRoute(request, params, async ({ repo, searchParams, requestId }) => {
    const query = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!query.success) {
      return jsonError("INVALID_REQUEST", requestId);
    }
    const page = await fetchCommitPage({
      ...repo,
      cursor: query.data.cursor ?? null,
      limit: query.data.limit,
    });
    return jsonSuccess(page, "Commits loaded");
  });
}
