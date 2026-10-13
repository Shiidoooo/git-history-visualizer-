import { z } from "zod";
import type { ReleasesData } from "@/lib/api/releases-contract";
import { getOctokit } from "./client";
import { classifyGithubError } from "./classify-error";
import { GithubApiError } from "./errors";
import { RELEASES_QUERY } from "./queries";

// GitHub's response is untrusted input: parse it once here and hand out our own shape.
const releasesResponseSchema = z.object({
  repository: z
    .object({
      releases: z.object({
        // GraphQL lists may contain null entries.
        nodes: z.array(
          z
            .object({
              tagName: z.string(),
              name: z.string().nullable(),
              publishedAt: z.string().nullable(),
              isPrerelease: z.boolean(),
              isDraft: z.boolean(),
            })
            .nullable(),
        ),
      }),
    })
    .nullable(),
});

/** Keeps published, stable releases only: prereleases (nightlies, canaries) would bury the timeline. */
export function mapReleases(raw: unknown): ReleasesData {
  const parsed = releasesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GithubApiError("UPSTREAM_ERROR", { cause: parsed.error });
  }
  if (parsed.data.repository === null) {
    throw new GithubApiError("REPO_NOT_FOUND");
  }

  const releases: ReleasesData["releases"] = [];
  for (const node of parsed.data.repository.releases.nodes) {
    if (node === null || node.isDraft || node.isPrerelease || node.publishedAt === null) continue;
    releases.push({
      tag: node.tagName,
      name: node.name?.trim() || node.tagName,
      publishedAt: node.publishedAt,
    });
  }
  return { releases };
}

export async function fetchReleases(params: { owner: string; repo: string }): Promise<ReleasesData> {
  let raw: unknown;
  try {
    raw = await getOctokit().graphql(RELEASES_QUERY, { owner: params.owner, name: params.repo });
  } catch (error) {
    throw classifyGithubError(error);
  }
  return mapReleases(raw);
}
