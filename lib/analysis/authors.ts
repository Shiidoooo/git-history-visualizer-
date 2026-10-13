type CommitAuthorInput = {
  additions: number;
  deletions: number;
  author: { name: string; login: string | null };
};

export type ContributorStats = {
  /** Stable identity: the GitHub login when known, otherwise the git author name. */
  key: string;
  name: string;
  commits: number;
  additions: number;
  deletions: number;
};

/** Ranks every author by commit count, then name, so ties always sort the same way. */
export function rankContributors(commits: readonly CommitAuthorInput[]): ContributorStats[] {
  const byKey = new Map<string, ContributorStats>();
  for (const commit of commits) {
    const { login, name } = commit.author;
    const key = login ? `login:${login}` : `name:${name}`;
    const stats = byKey.get(key) ?? {
      key,
      name: login ?? name,
      commits: 0,
      additions: 0,
      deletions: 0,
    };
    stats.commits += 1;
    stats.additions += commit.additions;
    stats.deletions += commit.deletions;
    byKey.set(key, stats);
  }
  return [...byKey.values()].sort(
    (a, b) => b.commits - a.commits || a.name.localeCompare(b.name),
  );
}
