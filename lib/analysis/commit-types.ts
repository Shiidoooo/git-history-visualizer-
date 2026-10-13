// Display order, and the order that breaks ties between types with the same count.
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "build",
  "ci",
  "style",
  "chore",
  "revert",
  "merge",
  "other",
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number];

export const COMMIT_TYPE_LABELS: Record<CommitType, string> = {
  feat: "Features",
  fix: "Fixes",
  perf: "Performance",
  refactor: "Refactors",
  docs: "Docs",
  test: "Tests",
  build: "Build",
  ci: "CI",
  style: "Style",
  chore: "Chores",
  revert: "Reverts",
  merge: "Merges",
  other: "Other",
};

// "type(scope)!: summary" is the Conventional Commits format.
const CONVENTIONAL_PREFIX = /^(\w+)(?:\([^)]*\))?!?:/;

const CONVENTIONAL_TYPES: Record<string, CommitType> = {
  feat: "feat",
  feature: "feat",
  fix: "fix",
  bugfix: "fix",
  perf: "perf",
  refactor: "refactor",
  docs: "docs",
  doc: "docs",
  test: "test",
  tests: "test",
  build: "build",
  ci: "ci",
  style: "style",
  chore: "chore",
  revert: "revert",
};

/**
 * Sorts a commit into a type from its headline. Only unambiguous signals count: a conventional
 * prefix, GitHub's own "Merge ..." and "Revert ..." wording, and a leading "Fix". Anything else
 * is "other" rather than a guess.
 */
export function classifyCommitMessage(message: string): CommitType {
  const headline = message.trim();
  if (/^merge\s/i.test(headline)) return "merge";
  if (/^revert\s/i.test(headline)) return "revert";

  const conventional = CONVENTIONAL_PREFIX.exec(headline);
  if (conventional) {
    const type = CONVENTIONAL_TYPES[conventional[1].toLowerCase()];
    if (type) return type;
  }

  if (/^fix(?:es|ed)?\b/i.test(headline)) return "fix";
  return "other";
}

export type CommitTypeCount = {
  type: CommitType;
  label: string;
  count: number;
};

/** Counts commits per type, biggest first. Types with no commits are left out. */
export function countCommitTypes(commits: readonly { message: string }[]): CommitTypeCount[] {
  const counts = new Map<CommitType, number>();
  for (const commit of commits) {
    const type = classifyCommitMessage(commit.message);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return COMMIT_TYPES.filter((type) => counts.has(type))
    .map((type) => ({ type, label: COMMIT_TYPE_LABELS[type], count: counts.get(type) ?? 0 }))
    .sort((a, b) => b.count - a.count || COMMIT_TYPES.indexOf(a.type) - COMMIT_TYPES.indexOf(b.type));
}
