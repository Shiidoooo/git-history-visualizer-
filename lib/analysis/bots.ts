type AuthorInput = { name: string; login: string | null };

// GitHub names automation accounts "<name>[bot]" (dependabot[bot], github-actions[bot], ...).
const BOT_SUFFIX = /\[bot\]$/i;

export function isBotAuthor(author: AuthorInput): boolean {
  return BOT_SUFFIX.test(author.login ?? "") || BOT_SUFFIX.test(author.name);
}

export function excludeBots<T extends { author: AuthorInput }>(commits: readonly T[]): T[] {
  return commits.filter((commit) => !isBotAuthor(commit.author));
}
