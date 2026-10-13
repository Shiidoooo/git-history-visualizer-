"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { parseRepoInput } from "@/lib/github/repo-ref";

export function RepoForm() {
  const router = useRouter();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseRepoInput(value);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/r/${encodeURIComponent(parsed.ref.owner)}/${encodeURIComponent(parsed.ref.repo)}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-xl flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        GitHub repository
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          name="repository"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="vercel/next.js or https://github.com/vercel/next.js"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
        <Button type="submit" size="lg" disabled={isPending} className="h-11 px-5 text-base">
          {isPending ? "Opening…" : "Visualize history"}
        </Button>
      </div>
      <p id={hintId} className="text-sm text-muted-foreground">
        Public repositories only. Paste owner/repo or a github.com link.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
