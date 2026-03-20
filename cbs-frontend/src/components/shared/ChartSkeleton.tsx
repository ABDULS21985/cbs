interface ChartSkeletonProps {
  height?: number;
}

export function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div
      className="w-full rounded-lg bg-muted/50 animate-pulse"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      <span className="sr-only">Loading chart...</span>
    </div>
  );
}
