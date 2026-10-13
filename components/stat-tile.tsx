export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:p-4 text-card-foreground min-w-0">
      <dt className="text-xs sm:text-sm text-muted-foreground truncate" title={label}>{label}</dt>
      <dd className="text-xl sm:text-2xl font-semibold tracking-tight truncate" title={value}>{value}</dd>
    </div>
  );
}
