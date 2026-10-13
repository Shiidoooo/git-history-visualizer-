import { commitsPageSchema, MAX_COMMITS_PER_REQUEST, type CommitsPage } from "./commits-contract";
import { requestApi } from "./request-api";

export function fetchCommitsPage(params: {
  owner: string;
  repo: string;
  cursor: string | null;
  signal?: AbortSignal;
}): Promise<CommitsPage> {
  const query = new URLSearchParams({ limit: String(MAX_COMMITS_PER_REQUEST) });
  if (params.cursor) query.set("cursor", params.cursor);
  const url = `/api/repo/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/commits?${query}`;
  return requestApi(url, commitsPageSchema, params.signal);
}
