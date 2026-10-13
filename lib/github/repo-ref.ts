import { z } from "zod";

// GitHub owners: alphanumeric or hyphen, at most 39 characters, no leading or trailing hyphen.
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const GITHUB_URL_PREFIX = /^(?:https?:\/\/)?(?:www\.)?github\.com\//i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const MAX_INPUT_LENGTH = 300;

export const repoRefSchema = z.object({
  owner: z.string().regex(OWNER_PATTERN),
  repo: z
    .string()
    .regex(REPO_PATTERN)
    .refine((repo) => repo !== "." && repo !== ".."),
});

export type RepoRef = z.infer<typeof repoRefSchema>;

export type ParsedRepoInput = { ok: true; ref: RepoRef } | { ok: false; message: string };

const FORMAT_HINT = "Enter a repository as owner/repo, for example vercel/next.js.";

/** Accepts `owner/repo` or a github.com URL. Never fetches anything the user typed. */
export function parseRepoInput(input: string): ParsedRepoInput {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, message: FORMAT_HINT };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { ok: false, message: "That input is too long. " + FORMAT_HINT };
  }

  const isGithubUrl = GITHUB_URL_PREFIX.test(trimmed);
  if (!isGithubUrl && URL_SCHEME.test(trimmed)) {
    return { ok: false, message: "Only github.com repositories are supported." };
  }

  const path = trimmed.replace(GITHUB_URL_PREFIX, "").split(/[?#]/)[0].replace(/\/+$/, "");
  const segments = path.split("/");
  // A bare `owner/repo` must be exactly two parts; a URL may carry extras like `/tree/main`.
  const hasValidShape = isGithubUrl ? segments.length >= 2 : segments.length === 2;
  if (!hasValidShape) {
    return { ok: false, message: FORMAT_HINT };
  }

  const [owner, rawRepo] = segments;
  const repo = rawRepo.replace(/\.git$/i, "");
  const result = repoRefSchema.safeParse({ owner, repo });
  if (!result.success) {
    return { ok: false, message: FORMAT_HINT };
  }
  return { ok: true, ref: result.data };
}
