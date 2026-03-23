export function SearchFormSkeleton() {
  return (
    <div className="surface-card p-5" role="status" aria-label="Loading search form">
      <div className="space-y-4 animate-pulse">
        <span className="sr-only">Loading search form</span>
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-11 w-full rounded-lg bg-muted" />
        </div>

        <div className="flex gap-3">
          <div className="h-10 w-36 rounded-lg bg-muted" />
          <div className="h-10 w-28 rounded-lg bg-muted" />
          <div className="h-10 w-32 rounded-lg bg-muted" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-10 w-full rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
