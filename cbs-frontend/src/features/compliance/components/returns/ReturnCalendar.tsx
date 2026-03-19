import type { CalendarDay } from '../../api/regulatoryApi';

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-green-100 text-green-700 border-green-200',
  ACKNOWLEDGED: 'bg-green-100 text-green-700 border-green-200',
  REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
  VALIDATION: 'bg-amber-100 text-amber-700 border-amber-200',
  DATA_EXTRACTION: 'bg-blue-100 text-blue-700 border-blue-200',
  SCHEDULED: 'bg-gray-100 text-gray-600 border-gray-200',
  APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
};

interface Props { data: CalendarDay[] }

export function ReturnCalendar({ data }: Props) {
  return (
    <div className="space-y-2">
      {data.filter((d) => d.returns.length > 0).map((day) => (
        <div key={day.date} className="flex gap-3 items-start">
          <div className="w-16 text-right flex-shrink-0">
            <div className="text-sm font-semibold">{new Date(day.date).getDate()}</div>
            <div className="text-xs text-muted-foreground">{new Date(day.date).toLocaleDateString('en', { month: 'short' })}</div>
          </div>
          <div className="flex-1 space-y-1">
            {day.returns.map((r) => {
              const color = statusColors[r.status] || 'bg-gray-100 text-gray-600 border-gray-200';
              return (
                <div key={r.id} className={`px-3 py-1.5 rounded border text-xs font-medium ${color}`}>
                  {r.regulatoryBody} — {r.name}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
