import { z } from "zod";

// The shape the commits API returns. Shared so the server builds it and the client parses it.

export const MAX_COMMITS_PER_REQUEST = 100;

export const commitSchema = z.object({
  sha: z.string(),
  committedAt: z.string(),
  message: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  changedFiles: z.number().int().nonnegative().nullable(),
  author: z.object({
    name: z.string(),
    login: z.string().nullable(),
  }),
});

export const commitsPageSchema = z.object({
  commits: z.array(commitSchema),
  nextCursor: z.string().nullable(),
  totalCount: z.number().int().nonnegative(),
});

export type Commit = z.infer<typeof commitSchema>;
export type CommitsPage = z.infer<typeof commitsPageSchema>;
