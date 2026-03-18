import { cn } from '@/lib/utils';

interface DataTableSkeletonProps {
  columns: number;
  rows?: number;
}

export function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 px-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={cn('h-4 rounded bg-muted animate-pulse', j === 0 ? 'w-24' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
