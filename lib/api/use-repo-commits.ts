"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { Commit } from "./commits-contract";
import { fetchCommitsPage } from "./commits-client";
import { isRetryableError } from "./request-api";

// The MVP looks at the most recent commits only; "load more" arrives with the Core phase.
export const TARGET_COMMITS = 200;
const STALE_TIME_MS = 5 * 60_000;

export function useRepoCommits(owner: string, repo: string, target = TARGET_COMMITS) {
  const query = useInfiniteQuery({
    queryKey: ["commits", owner, repo],
    queryFn: ({ pageParam, signal }) => fetchCommitsPage({ owner, repo, cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: (failureCount, error) => failureCount < 1 && isRetryableError(error),
    staleTime: STALE_TIME_MS,
  });

  const { data, hasNextPage, isFetchingNextPage, isError, fetchNextPage, refetch } = query;

  const fetched = useMemo(() => data?.pages.flatMap((page) => page.commits) ?? [], [data]);
  const commits: Commit[] = useMemo(() => fetched.slice(0, target), [fetched, target]);
  const totalCount = data?.pages[0]?.totalCount ?? null;
  const goal = totalCount === null ? null : Math.min(target, totalCount);

  // Chunks are fetched one request at a time so every request stays short and progress is real.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError && fetched.length < target) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isError, fetched.length, target, fetchNextPage]);

  const hasData = data !== undefined;
  return {
    commits,
    totalCount,
    goal,
    isLoading: !hasData && !isError,
    isLoadingMore: hasData && commits.length < (goal ?? 0) && !isError,
    isEmpty: hasData && totalCount === 0,
    error: isError ? query.error : null,
    hasData,
    retry: () => (hasData ? void fetchNextPage() : void refetch()),
  };
}
