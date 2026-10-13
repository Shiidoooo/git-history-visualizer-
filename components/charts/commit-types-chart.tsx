"use client";

import { useMemo } from "react";
import { ChartCard } from "@/components/chart-card";
import { countCommitTypes } from "@/lib/analysis/commit-types";
import { formatCount, pluralize } from "@/lib/format/display";
import { RankedBars } from "./ranked-bars";

function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function CommitTypesChart({ commits }: { commits: readonly { message: string }[] }) {
  const counts = useMemo(() => countCommitTypes(commits), [commits]);
  const total = commits.length;
  const otherCount = counts.find((entry) => entry.type === "other")?.count ?? 0;

  return (
    <ChartCard
      title="Commit types"
      description="What kind of change each commit describes, read from its message prefix (fix:, feat:, docs: and so on)."
    >
      <RankedBars
        ariaLabel="Commits by type"
        items={counts.map((entry) => ({
          key: entry.type,
          label: entry.label,
          value: entry.count,
          title: `${entry.label}: ${formatCount(entry.count)} ${pluralize(entry.count, "commit")} (${percentOf(entry.count, total)}%)`,
        }))}
      />
      {otherCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {formatCount(otherCount)} of {formatCount(total)} {pluralize(total, "commit")} ({percentOf(otherCount, total)}%)
          do not follow a recognizable pattern, so they are counted as Other.
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2">
          View as table
        </summary>
        <div
          role="region"
          aria-label="Commit types table"
          tabIndex={0}
          className="mt-2 max-h-64 overflow-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="w-full text-left">
            <caption className="sr-only">Commits by type, biggest first.</caption>
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Commits
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {counts.map((entry) => (
                <tr key={entry.type} className="border-t border-border">
                  <th scope="row" className="px-3 py-1.5 font-normal">
                    {entry.label}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(entry.count)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{percentOf(entry.count, total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  );
}
