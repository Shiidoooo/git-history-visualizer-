"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CommitTypesChart } from "@/components/charts/commit-types-chart";
import { ContributorsChart } from "@/components/charts/contributors-chart";
import { TimelineChart } from "@/components/charts/timeline-chart";
import { DashboardSkeleton, EmptyRepoState, RepoErrorState } from "@/components/repo-states";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/api/describe-error";
import { useReleases } from "@/lib/api/use-releases";
import { useRepoCommits } from "@/lib/api/use-repo-commits";
import { excludeBots } from "@/lib/analysis/bots";
import { summarizeCommits } from "@/lib/analysis/summary";
import { formatCompact, formatCount, formatDay, pluralize } from "@/lib/format/display";
import type { RepoRef } from "@/lib/github/repo-ref";
import { useDashboardFilters } from "@/lib/ui/use-dashboard-filters";

function LoadProgress({ loaded, goal }: { loaded: number; goal: number | null }) {
  const percent = goal ? Math.min(100, Math.round((loaded / goal) * 100)) : 0;
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {goal === null ? "Fetching commits…" : `Fetched ${formatCount(loaded)}/${formatCount(goal)} commits…`}
      </p>
      <div
        role="progressbar"
        aria-label="Commits fetched"
        aria-valuemin={0}
        aria-valuemax={goal ?? undefined}
        aria-valuenow={goal === null ? undefined : loaded}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-chart-1 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function RepoDashboard({ owner, repo }: RepoRef) {
  const { commits, totalCount, goal, isLoading, isLoadingMore, isEmpty, error, hasData, retry } = useRepoCommits(
    owner,
    repo,
  );
  const releases = useReleases(owner, repo);
  const { hideBots, setHideBots } = useDashboardFilters();

  // One filtered list feeds every stat and chart, so all the numbers on the page agree.
  const humanCommits = useMemo(() => excludeBots(commits), [commits]);
  const botCount = commits.length - humanCommits.length;
  const visibleCommits = hideBots ? humanCommits : commits;
  const summary = useMemo(() => summarizeCommits(visibleCommits), [visibleCommits]);

  let body;
  if (error && !hasData) {
    body = <RepoErrorState error={error} onRetry={retry} />;
  } else if (isLoading) {
    body = (
      <>
        <LoadProgress loaded={0} goal={null} />
        <DashboardSkeleton />
      </>
    );
  } else if (isEmpty) {
    body = <EmptyRepoState />;
  } else {
    const isPartial = totalCount !== null && totalCount > commits.length;
    body = (
      <>
        {isLoadingMore ? <LoadProgress loaded={commits.length} goal={goal} /> : null}
        {error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm">
              <span className="font-medium">Couldn&apos;t load more commits.</span> {describeError(error).message}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : null}

        {botCount > 0 || hideBots ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideBots}
                onChange={(event) => setHideBots(event.target.checked)}
                className="size-4 cursor-pointer accent-[var(--chart-1)]"
              />
              Hide bot commits ({formatCount(botCount)})
            </label>
          </div>
        ) : null}

        {visibleCommits.length === 0 ? (
          <div role="status" className="flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-card p-6">
            <p className="text-muted-foreground">Every loaded commit is from a bot, so there is nothing to chart.</p>
            <div>
              <Button type="button" variant="outline" size="lg" onClick={() => setHideBots(false)}>
                Show bot commits
              </Button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Commits" value={formatCount(summary.commitCount)} />
              <StatTile label="Contributors" value={formatCount(summary.contributorCount)} />
              <StatTile label="Lines added" value={formatCompact(summary.additions)} />
              <StatTile label="Lines removed" value={formatCompact(summary.deletions)} />
            </dl>
            <TimelineChart commits={visibleCommits} releases={releases} />
            <ContributorsChart commits={visibleCommits} />
            <CommitTypesChart commits={visibleCommits} />
          </>
        )}

        {!isLoadingMore && totalCount !== null ? (
          <p className="text-sm text-muted-foreground">
            {isPartial
              ? `Showing the most recent ${formatCount(commits.length)} of ${formatCount(totalCount)} commits.`
              : `Showing all ${formatCount(totalCount)} ${pluralize(totalCount, "commit")}.`}
            {hideBots && botCount > 0
              ? ` ${formatCount(botCount)} bot ${pluralize(botCount, "commit")} hidden.`
              : ""}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/" className="w-fit rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
          ← Try another repository
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          <a
            href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {owner}/{repo}
          </a>
        </h1>
        {summary.firstDay && summary.lastDay ? (
          <p className="text-sm text-muted-foreground">
            Commits from {formatDay(summary.firstDay, { withYear: true })} to {formatDay(summary.lastDay, { withYear: true })}
          </p>
        ) : null}
      </header>
      {body}
    </div>
  );
}
