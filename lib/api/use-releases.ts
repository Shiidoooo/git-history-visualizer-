"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReleasesData } from "./releases-client";
import type { Release } from "./releases-contract";
import { isRetryableError } from "./request-api";

const STALE_TIME_MS = 10 * 60_000;
const NO_RELEASES: Release[] = [];

/**
 * Releases are a nice extra on the timeline, never a requirement: if they fail to load the
 * chart simply has no markers, so the error is not surfaced to the reader.
 */
export function useReleases(owner: string, repo: string): Release[] {
  const { data } = useQuery({
    queryKey: ["releases", owner, repo],
    queryFn: ({ signal }) => fetchReleasesData({ owner, repo, signal }),
    retry: (failureCount, error) => failureCount < 1 && isRetryableError(error),
    staleTime: STALE_TIME_MS,
  });
  return data?.releases ?? NO_RELEASES;
}
