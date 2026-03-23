import { cn } from '@/lib/utils';
import type { HourlyHeatmap } from '../../api/transactionAnalyticsApi';

interface VelocityHeatmapProps {
  data: HourlyHeatmap | null;
  isLoading?: boolean;
  onCellClick?: (dayOfWeek: number, hour: number) => void;
}

function heatColor(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) return 'bg-white';
  const ratio = count / maxCount;
  if (ratio >= 0.85) return 'bg-blue-900 text-white';
  if (ratio >= 0.6) return 'bg-blue-700 text-white';
  if (ratio >= 0.35) return 'bg-blue-400 text-white';
  return 'bg-blue-100 text-slate-700';
}

export function VelocityHeatmap({
  data,
  isLoading = false,
  onCellClick,
}: VelocityHeatmapProps) {
  if (isLoading) {
    return <div className="h-[520px] animate-pulse surface-card" />;
  }

  const cells = data?.cells ?? [];
  const maxCount = Math.max(...cells.map((cell) => cell.count), 0);
  const days = Array.from(new Set(cells.map((cell) => `${cell.dayOfWeek}:${cell.dayLabel}`))).map((value) => {
    const [dayOfWeek, dayLabel] = value.split(':');
    return { dayOfWeek: Number(dayOfWeek), dayLabel };
  });

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Transaction Velocity & Anomaly Detection</h2>
        <p className="text-sm text-muted-foreground">
          Hourly activity heatmap across the selected period. Click a slot to drill into matching transactions.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-[80px_repeat(24,minmax(32px,1fr))] gap-1 text-xs">
          <div />
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="px-1 text-center text-muted-foreground">{hour}</div>
          ))}

          {days.map((day) => (
            <div key={day.dayOfWeek} className="contents">
              <div className="flex items-center text-sm font-medium text-foreground">{day.dayLabel}</div>
              {Array.from({ length: 24 }).map((_, hour) => {
                const cell = cells.find((entry) => entry.dayOfWeek === day.dayOfWeek && entry.hour === hour);
                const count = cell?.count ?? 0;
                return (
                  <button
                    key={`${day.dayOfWeek}-${hour}`}
                    type="button"
                    onClick={() => onCellClick?.(day.dayOfWeek, hour)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border text-[11px] font-medium transition-transform hover:scale-[1.02]',
                      heatColor(count, maxCount),
                      cell?.anomaly && 'ring-2 ring-orange-400 ring-offset-1',
                    )}
                    title={`${day.dayLabel} ${hour}:00 • ${count.toLocaleString()} transactions`}
                  >
                    {count > 0 ? count.toLocaleString() : '—'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-100" />Low</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-400" />Medium</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-900" />High</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-400" />Anomaly</span>
      </div>

      <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700">
        <p className="font-medium">{data?.anomalyCount ?? 0} anomalies detected</p>
        <div className="mt-2 space-y-1 text-xs">
          {(data?.anomalies ?? []).slice(0, 4).map((anomaly) => (
            <p key={`${anomaly.dayLabel}-${anomaly.hour}`}>
              {anomaly.dayLabel} at {String(anomaly.hour).padStart(2, '0')}:00 recorded {anomaly.count.toLocaleString()} transactions
              against an average of {anomaly.averageCount.toFixed(2)}.
            </p>
          ))}
          {(data?.anomalies ?? []).length === 0 && <p>No abnormal hourly spikes in the selected period.</p>}
        </div>
      </div>
    </div>
  );
}
