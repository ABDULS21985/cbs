interface ChartSkeletonProps {
  height?: number;
  showTitle?: boolean;
}

export function ChartSkeleton({ height = 300, showTitle = true }: ChartSkeletonProps) {
  return (
    <div className="animate-pulse">
      {showTitle && <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />}
      <div
        className="bg-gray-100 rounded-lg flex items-end justify-around p-4 gap-2"
        style={{ height }}
        role="status"
        aria-label="Loading chart..."
      >
        {[65, 40, 75, 55, 80, 45, 60, 50, 70, 35].map((h, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t flex-1"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          border: 0,
        }}
        aria-live="polite"
      >
        Loading chart data...
      </span>
    </div>
  );
}
