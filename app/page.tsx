import Link from "next/link";
import { RepoForm } from "@/components/repo-form";

const EXAMPLE_REPOS = ["vercel/next.js", "facebook/react", "torvalds/linux"] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-8 py-8 sm:py-16">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">See how a repository evolved</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Paste a public GitHub repository to see its recent commit activity and who has been contributing.
        </p>
      </div>
      <RepoForm />
      <section aria-labelledby="examples-heading" className="flex flex-col gap-2">
        <h2 id="examples-heading" className="text-sm font-medium">
          Try an example
        </h2>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLE_REPOS.map((repo) => (
            <li key={repo}>
              <Link
                href={`/r/${repo}`}
                prefetch={false}
                className="inline-flex min-h-[40px] sm:h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {repo}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
