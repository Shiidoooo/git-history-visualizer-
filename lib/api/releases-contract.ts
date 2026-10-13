import { z } from "zod";

export const releaseSchema = z.object({
  tag: z.string(),
  name: z.string(),
  publishedAt: z.string(),
});

export const releasesDataSchema = z.object({
  releases: z.array(releaseSchema),
});

export type Release = z.infer<typeof releaseSchema>;
export type ReleasesData = z.infer<typeof releasesDataSchema>;
