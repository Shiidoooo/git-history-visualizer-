import { releasesDataSchema, type ReleasesData } from "./releases-contract";
import { requestApi } from "./request-api";

export function fetchReleasesData(params: {
  owner: string;
  repo: string;
  signal?: AbortSignal;
}): Promise<ReleasesData> {
  const url = `/api/repo/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}/releases`;
  return requestApi(url, releasesDataSchema, params.signal);
}
