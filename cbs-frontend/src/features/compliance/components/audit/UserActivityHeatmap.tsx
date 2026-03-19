import type { UserActivityDay } from '../../api/auditApi';

interface Props { data: UserActivityDay[] }

const hours = Array.from({ length: 24 }, (_, i) => i);
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function UserActivityHeatmap({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-600';
    if (intensity > 0.5) return 'bg-green-500';
    if (intensity > 0.25) return 'bg-green-400';
    return 'bg-green-200';
  };

  // Group by day of week
  const grid: Record<string, number[]> = {};
  dayLabels.forEach((d) => { grid[d] = new Array(24).fill(0); });

  data.forEach((entry) => {
    const dow = new Date(entry.date).getDay();
    const dayLabel = dayLabels[dow === 0 ? 6 : dow - 1];
    if (grid[dayLabel]) grid[dayLabel][entry.hour] = entry.count;
  });

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Activity Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-0.5 mb-1 ml-10">
            {hours.map((h) => <div key={h} className="w-5 text-center text-[9px] text-muted-foreground">{h}</div>)}
          </div>
          {dayLabels.map((day) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-8 text-right text-[10px] text-muted-foreground mr-1">{day}</div>
              {hours.map((h) => (
                <div key={h} className={`w-5 h-5 rounded-sm ${getColor(grid[day][h])}`} title={`${day} ${h}:00 — ${grid[day][h]} actions`} />
              ))}
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
