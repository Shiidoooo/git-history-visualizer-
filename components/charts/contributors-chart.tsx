"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/chart-card";
import { rankContributors } from "@/lib/analysis/authors";
import { formatCount, pluralize } from "@/lib/format/display";
import { RankedBars } from "./ranked-bars";

const TOP_COUNT = 10;

type CommitInput = {
  additions: number;
  deletions: number;
  author: { name: string; login: string | null };
};

export function ContributorsChart({ commits }: { commits: readonly CommitInput[] }) {
  const ranked = useMemo(() => rankContributors(commits), [commits]);
  const top = ranked.slice(0, TOP_COUNT);
  const hiddenCount = ranked.length - top.length;

  return (
    <ChartCard title="Top contributors" description="Authors with the most commits in the loaded history.">
      <RankedBars
        ariaLabel="Top contributors by commit count"
        items={top.map((contributor) => ({
          key: contributor.key,
          label: contributor.name,
          value: contributor.commits,
          title: `${contributor.name}: ${formatCount(contributor.commits)} ${pluralize(contributor.commits, "commit")}, ${formatCount(contributor.additions)} lines added, ${formatCount(contributor.deletions)} removed`,
        }))}
      />
      {hiddenCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          and {formatCount(hiddenCount)} more {pluralize(hiddenCount, "contributor")}. See the table for everyone.
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
          View as table
        </summary>
        <div
          role="region"
          aria-label="Contributors table"
          tabIndex={0}
          className="mt-2 max-h-64 overflow-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="w-full min-w-[380px] sm:min-w-full text-left text-xs sm:text-sm">
            <caption className="sr-only">All contributors, ranked by commit count.</caption>
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                <th scope="col" className="px-2.5 py-2 sm:px-3 font-medium">
                  Contributor
                </th>
                <th scope="col" className="px-2.5 py-2 sm:px-3 text-right font-medium whitespace-nowrap">
                  Commits
                </th>
                <th scope="col" className="px-2.5 py-2 sm:px-3 text-right font-medium whitespace-nowrap">
                  Lines added
                </th>
                <th scope="col" className="px-2.5 py-2 sm:px-3 text-right font-medium whitespace-nowrap">
                  Lines removed
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((contributor) => (
                <tr key={contributor.key} className="border-t border-border">
                  <th scope="row" className="px-2.5 py-1.5 sm:px-3 font-normal truncate max-w-[140px] sm:max-w-none" title={contributor.name}>
                    {contributor.name}
                  </th>
                  <td className="px-2.5 py-1.5 sm:px-3 text-right tabular-nums whitespace-nowrap">{formatCount(contributor.commits)}</td>
                  <td className="px-2.5 py-1.5 sm:px-3 text-right tabular-nums whitespace-nowrap">{formatCount(contributor.additions)}</td>
                  <td className="px-2.5 py-1.5 sm:px-3 text-right tabular-nums whitespace-nowrap">{formatCount(contributor.deletions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  );
}
