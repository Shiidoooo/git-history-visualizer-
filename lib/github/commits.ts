import { z } from "zod";
import type { CommitsPage } from "@/lib/api/commits-contract";
import { getOctokit } from "./client";
import { classifyGithubError } from "./classify-error";
import { GithubApiError } from "./errors";
import { COMMIT_HISTORY_QUERY } from "./queries";

// GitHub's response is untrusted input: parse it once here and hand out our own shape.
const historyResponseSchema = z.object({
  repository: z
    .object({
      defaultBranchRef: z
        .object({
          target: z
            .object({
              history: z.object({
                totalCount: z.number().int().nonnegative(),
                pageInfo: z.object({
                  hasNextPage: z.boolean(),
                  endCursor: z.string().nullable(),
                }),
                nodes: z.array(
                  z.object({
                    oid: z.string(),
                    committedDate: z.string(),
                    messageHeadline: z.string(),
                    additions: z.number().int().nonnegative(),
                    deletions: z.number().int().nonnegative(),
                    changedFilesIfAvailable: z.number().int().nonnegative().nullable(),
                    author: z
                      .object({
                        name: z.string().nullable(),
                        user: z.object({ login: z.string() }).nullable(),
                      })
                      .nullable(),
                  }),
                ),
              }),
            })
            .nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

const UNKNOWN_AUTHOR = "Unknown";

export function mapCommitHistory(raw: unknown): CommitsPage {
  const parsed = historyResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GithubApiError("UPSTREAM_ERROR", { cause: parsed.error });
  }

  const { repository } = parsed.data;
  if (repository === null) {
    throw new GithubApiError("REPO_NOT_FOUND");
  }

  // A repository with no commits has no default branch.
  const history = repository.defaultBranchRef?.target?.history;
  if (!history) {
    return { commits: [], nextCursor: null, totalCount: 0 };
  }

  return {
    commits: history.nodes.map((node) => ({
      sha: node.oid,
      committedAt: node.committedDate,
      message: node.messageHeadline,
      additions: node.additions,
      deletions: node.deletions,
      changedFiles: node.changedFilesIfAvailable,
      author: {
        name: node.author?.name ?? node.author?.user?.login ?? UNKNOWN_AUTHOR,
        login: node.author?.user?.login ?? null,
      },
    })),
    nextCursor: history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null,
    totalCount: history.totalCount,
  };
}

export async function fetchCommitPage(params: {
  owner: string;
  repo: string;
  cursor: string | null;
  limit: number;
}): Promise<CommitsPage> {
  let raw: unknown;
  try {
    raw = await getOctokit().graphql(COMMIT_HISTORY_QUERY, {
      owner: params.owner,
      name: params.repo,
      first: params.limit,
      after: params.cursor,
    });
  } catch (error) {
    throw classifyGithubError(error);
  }
  return mapCommitHistory(raw);
}
