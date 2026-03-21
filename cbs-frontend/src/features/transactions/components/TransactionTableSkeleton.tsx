interface TransactionTableSkeletonProps {
  rows?: number;
}

export function TransactionTableSkeleton({ rows = 10 }: TransactionTableSkeletonProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden" role="status" aria-label="Loading transactions">
      <span className="sr-only">Loading transactions</span>
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="grid grid-cols-[48px_160px_160px_180px_1fr_120px_120px_120px_120px] gap-4 animate-pulse">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-muted" />
          ))}
        </div>
      </div>

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[48px_160px_160px_180px_1fr_120px_120px_120px_120px] gap-4 px-4 py-4 animate-pulse"
          >
            {Array.from({ length: 9 }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`h-4 rounded bg-muted ${colIndex === 0 ? 'w-5' : 'w-full'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
