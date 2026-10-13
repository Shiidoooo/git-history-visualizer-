import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { describeError } from "@/lib/api/describe-error";
import { cn } from "@/lib/utils";

const TRY_ANOTHER_LINK = (
  <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
    Try another repository
  </Link>
);

export function RepoErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, message, canRetry } = describeError(error);
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canRetry && onRetry ? (
          <Button type="button" size="lg" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {TRY_ANOTHER_LINK}
      </div>
    </div>
  );
}

export function EmptyRepoState() {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">This repository has no commits yet</h2>
        <p className="text-muted-foreground">There is nothing to chart until someone makes the first commit.</p>
      </div>
      <div>{TRY_ANOTHER_LINK}</div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-muted" />
      <div className="h-80 rounded-xl bg-muted" />
    </div>
  );
}
