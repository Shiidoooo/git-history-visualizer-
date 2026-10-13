import { rankContributors } from "./authors";

type CommitSummaryInput = {
  committedAt: string;
  additions: number;
  deletions: number;
  author: { name: string; login: string | null };
};

export type CommitsSummary = {
  commitCount: number;
  contributorCount: number;
  /** First and last commit day (YYYY-MM-DD, UTC), or null when no commit has a valid date. */
  firstDay: string | null;
  lastDay: string | null;
  additions: number;
  deletions: number;
};

export function summarizeCommits(commits: readonly CommitSummaryInput[]): CommitsSummary {
  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  let additions = 0;
  let deletions = 0;

  for (const commit of commits) {
    additions += commit.additions;
    deletions += commit.deletions;
    const time = new Date(commit.committedAt).getTime();
    if (Number.isNaN(time)) continue;
    earliest = Math.min(earliest, time);
    latest = Math.max(latest, time);
  }

  const hasDates = Number.isFinite(earliest);
  return {
    commitCount: commits.length,
    contributorCount: rankContributors(commits).length,
    firstDay: hasDates ? new Date(earliest).toISOString().slice(0, 10) : null,
    lastDay: hasDates ? new Date(latest).toISOString().slice(0, 10) : null,
    additions,
    deletions,
  };
}
