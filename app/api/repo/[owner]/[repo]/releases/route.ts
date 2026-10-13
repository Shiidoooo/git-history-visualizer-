import { handleRepoRoute } from "@/lib/api/handle-repo-route";
import { jsonSuccess } from "@/lib/api/respond";
import { fetchReleases } from "@/lib/github/releases";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
): Promise<Response> {
  return handleRepoRoute(request, params, async ({ repo }) => {
    return jsonSuccess(await fetchReleases(repo), "Releases loaded");
  });
}
