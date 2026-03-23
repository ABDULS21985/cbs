import { cn } from '@/lib/utils';

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface ConsentFunnelChartProps {
  stages: FunnelStage[];
  loading?: boolean;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { label: 'Created', count: 0, color: 'bg-blue-500' },
  { label: 'Pending', count: 0, color: 'bg-amber-500' },
  { label: 'Authorised', count: 0, color: 'bg-green-500' },
  { label: 'Active', count: 0, color: 'bg-emerald-600' },
];

export function ConsentFunnelChart({
  stages = DEFAULT_STAGES,
  loading,
}: ConsentFunnelChartProps) {
  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-72 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Consent Funnel</h3>

      <div className="flex flex-col items-center gap-2 py-4">
        {stages.map((stage, index) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 20);
          const conversionRate =
            index > 0 && stages[index - 1].count > 0
              ? ((stage.count / stages[index - 1].count) * 100).toFixed(1)
              : null;

          return (
            <div key={stage.label} className="w-full flex flex-col items-center">
              {/* Conversion arrow */}
              {conversionRate !== null && (
                <div className="flex items-center gap-1 mb-1">
                  <svg
                    className="w-3 h-3 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {conversionRate}%
                  </span>
                </div>
              )}

              {/* Funnel bar */}
              <div
                className="relative transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              >
                <div
                  className={cn(
                    'h-14 rounded-lg flex items-center justify-between px-4',
                    stage.color,
                  )}
                >
                  <span className="text-white text-sm font-medium">{stage.label}</span>
                  <span className="text-white text-lg font-bold tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Overall Conversion</p>
            <p className="text-lg font-bold tabular-nums">
              {stages.length >= 2 && stages[0].count > 0
                ? `${((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Drop-off</p>
            <p className="text-lg font-bold tabular-nums">
              {stages.length >= 2
                ? (stages[0].count - stages[stages.length - 1].count).toLocaleString()
                : '0'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
