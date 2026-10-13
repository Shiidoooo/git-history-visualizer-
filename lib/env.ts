import { z } from "zod";

const envSchema = z
  .object({
    GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
    // Redis is only needed from the Core phase (caching, rate limiting), so both are optional,
    // but one without the other is a misconfiguration.
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  })
  .refine(
    (env) => Boolean(env.UPSTASH_REDIS_REST_URL) === Boolean(env.UPSTASH_REDIS_REST_TOKEN),
    {
      message: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set together",
      path: ["UPSTASH_REDIS_REST_TOKEN"],
    },
  );

export type Env = z.infer<typeof envSchema>;

/** Parses the given environment. Reports variable names only, never their values. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  // Blank values (`KEY=` in .env files) count as unset.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== ""),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${problems}\nSee .env.example and copy it to .env.local.`,
    );
  }
  return result.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
