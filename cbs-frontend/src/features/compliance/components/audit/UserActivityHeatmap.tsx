import type { UserActivityHeatmapData } from '../../api/auditApi';

interface Props { data: UserActivityHeatmapData }

const hours = Array.from({ length: 24 }, (_, i) => i);
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKeys = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function UserActivityHeatmap({ data }: Props) {
  const maxCount = Math.max(
    ...dayKeys.flatMap((day) => hours.map((h) => (data.heatmap[day]?.[String(h)] ?? 0))),
    1
  );

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-600';
    if (intensity > 0.5) return 'bg-green-500';
    if (intensity > 0.25) return 'bg-green-400';
    return 'bg-green-200';
  };

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-1">Activity Heatmap — {data.userId}</h3>
      <p className="text-xs text-muted-foreground mb-4">{data.totalEvents.toLocaleString()} total events</p>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-0.5 mb-1 ml-10">
            {hours.map((h) => (
              <div key={h} className="w-5 text-center text-[9px] text-muted-foreground">{h}</div>
            ))}
          </div>
          {dayKeys.map((day, idx) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-8 text-right text-[10px] text-muted-foreground mr-1">{dayLabels[idx]}</div>
              {hours.map((h) => {
                const count = data.heatmap[day]?.[String(h)] ?? 0;
                return (
                  <div
                    key={h}
                    className={`w-5 h-5 rounded-sm ${getColor(count)}`}
                    title={`${dayLabels[idx]} ${h}:00 — ${count} actions`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-4 h-4 rounded-sm bg-muted" />
        <div className="w-4 h-4 rounded-sm bg-green-200" />
        <div className="w-4 h-4 rounded-sm bg-green-400" />
        <div className="w-4 h-4 rounded-sm bg-green-500" />
        <div className="w-4 h-4 rounded-sm bg-green-600" />
        <span>More</span>
      </div>
    </div>
  );
}
