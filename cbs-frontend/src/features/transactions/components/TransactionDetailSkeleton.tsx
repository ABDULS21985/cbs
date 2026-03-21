export function TransactionDetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" role="status" aria-label="Loading transaction detail">
      <span className="sr-only">Loading transaction detail</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-8 w-28 rounded-md bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
        <div className="h-8 w-24 rounded-full bg-muted" />
      </div>

      <div className="grid gap-4 rounded-xl bg-muted/20 p-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-12 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 rounded-xl border bg-muted/10 p-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-7 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`space-y-2 ${index === 5 ? 'md:col-span-3' : ''}`}>
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
