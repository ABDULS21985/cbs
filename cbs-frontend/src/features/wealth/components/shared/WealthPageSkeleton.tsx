import { cn } from '@/lib/utils';

// ─── Individual Skeletons ────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="surface-card p-4 animate-pulse" role="status" aria-label="Loading stat card">
      <div className="h-3 w-20 bg-muted/50 rounded mb-3" />
      <div className="h-7 w-28 bg-muted/50 rounded mb-2" />
      <div className="h-3 w-16 bg-muted/50 rounded" />
    </div>
  );
}

interface ChartSkeletonProps {
  height?: number;
}

export function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div
      className="bg-muted/30 rounded-xl animate-pulse"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="surface-card overflow-hidden animate-pulse" role="status" aria-label="Loading table">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3 border-b bg-muted/20">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn('h-3 bg-muted/50 rounded', i === 0 ? 'w-24' : 'flex-1')}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-4 py-3 border-b last:border-b-0">
          {Array.from({ length: 5 }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                'h-3 bg-muted/30 rounded',
                colIdx === 0 ? 'w-24' : 'flex-1',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Full Page Skeleton ──────────────────────────────────────────────────────

export function WealthPageSkeleton() {
  return (
    <div className="px-6 pb-8 space-y-6" role="status" aria-label="Loading page">
      {/* Stat cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartSkeleton height={256} />
        <ChartSkeleton height={256} />
      </div>

      {/* Table skeleton */}
      <TableSkeleton rows={5} />
    </div>
  );
}
