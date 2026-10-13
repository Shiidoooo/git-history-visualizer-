import { Suspense } from "react";
import { RepoDashboard } from "@/components/repo-dashboard";
import { DashboardSkeleton, RepoErrorState } from "@/components/repo-states";
import { ApiClientError } from "@/lib/api/request-api";
import { repoRefSchema } from "@/lib/github/repo-ref";

export default function RepoPage({ params }: PageProps<"/r/[owner]/[repo]">) {
  // Route params are only known per request, so they are read inside a Suspense boundary.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <RepoContent params={params} />
    </Suspense>
  );
}

async function RepoContent({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const parsed = repoRefSchema.safeParse(await params);
  if (!parsed.success) {
    return (
      <RepoErrorState
        error={new ApiClientError("INVALID_REPO", "Enter a valid GitHub repository, for example vercel/next.js.")}
      />
    );
  }
  return <RepoDashboard owner={parsed.data.owner} repo={parsed.data.repo} />;
}
