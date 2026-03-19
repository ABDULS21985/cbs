import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { HourlyHeatmapCell } from '../../api/channelAnalyticsApi';

interface HourlyHeatmapProps {
  data: HourlyHeatmapCell[];
  isLoading?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function intensityToStyle(intensity: number): string {
  if (intensity === 0) return 'bg-muted/30';
  if (intensity < 0.15) return 'bg-blue-100 dark:bg-blue-950';
  if (intensity < 0.3)  return 'bg-blue-200 dark:bg-blue-900';
  if (intensity < 0.45) return 'bg-blue-300 dark:bg-blue-800';
  if (intensity < 0.6)  return 'bg-blue-400 dark:bg-blue-700';
  if (intensity < 0.75) return 'bg-blue-500 dark:bg-blue-600';
  if (intensity < 0.9)  return 'bg-blue-600 dark:bg-blue-500';
  return 'bg-blue-700 dark:bg-blue-400';
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

interface TooltipState {
  hour: number;
  day: number;
  count: number;
  x: number;
  y: number;
}

export function HourlyHeatmap({ data, isLoading }: HourlyHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-64 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  // Build lookup map: [hour][dayOfWeek] -> cell
  const cellMap: Record<string, HourlyHeatmapCell> = {};
  for (const cell of data) {
    cellMap[`${cell.hour}-${cell.dayOfWeek}`] = cell;
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Transaction Heatmap</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Identify peak hours for capacity planning — darker cells indicate higher transaction volume
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day-of-week column headers */}
          <div className="flex gap-0 ml-14 mb-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="w-7 text-center text-[10px] font-medium text-muted-foreground flex-shrink-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex items-center gap-0 mb-0.5">
              {/* Hour label — only show every 3 hours */}
              <div className="w-14 text-right pr-2 flex-shrink-0">
                {hour % 3 === 0 ? (
                  <span className="text-[10px] text-muted-foreground">{formatHour(hour)}</span>
                ) : null}
              </div>

              {DAYS.map((_, dayIdx) => {
                const cell = cellMap[`${hour}-${dayIdx}`];
                const intensity = cell?.intensity ?? 0;
                const count = cell?.count ?? 0;
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'w-7 h-7 rounded-sm cursor-pointer flex-shrink-0 transition-opacity hover:opacity-80',
                      intensityToStyle(intensity),
                    )}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ hour, day: dayIdx, count, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="flex gap-0.5">
          {['bg-muted/30', 'bg-blue-100 dark:bg-blue-950', 'bg-blue-200 dark:bg-blue-900',
            'bg-blue-300 dark:bg-blue-800', 'bg-blue-400 dark:bg-blue-700',
            'bg-blue-500 dark:bg-blue-600', 'bg-blue-600 dark:bg-blue-500',
            'bg-blue-700 dark:bg-blue-400'].map((cls, i) => (
            <div key={i} className={cn('w-5 h-3 rounded-sm', cls)} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <span className="font-semibold text-foreground">
            {DAYS[tooltip.day]}, {formatHour(tooltip.hour)}
          </span>
          <span className="text-muted-foreground ml-2">
            — {tooltip.count.toLocaleString()} transactions
          </span>
        </div>
      )}
    </div>
  );
}
