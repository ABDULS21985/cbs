import type { ComplianceCalendarEntry } from '../../api/regulatoryApi';

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-green-100 text-green-700 border-green-200',
  REVIEWED: 'bg-blue-100 text-blue-700 border-blue-200',
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface Props { data: ComplianceCalendarEntry[] }

export function ReturnCalendar({ data }: Props) {
  // Group by dueDate
  const byDate = data.reduce<Record<string, ComplianceCalendarEntry[]>>((acc, entry) => {
    const date = entry.dueDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(byDate).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No calendar entries found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedDates.map((date) => (
        <div key={date} className="flex gap-3 items-start">
          <div className="w-16 text-right flex-shrink-0">
            <div className="text-sm font-semibold">{new Date(date + 'T00:00:00').getDate()}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(date + 'T00:00:00').toLocaleDateString('en', { month: 'short', year: '2-digit' })}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {byDate[date].map((r) => {
              const color = statusColors[r.status] || 'bg-gray-100 text-gray-600 border-gray-200';
              return (
                <div
                  key={r.reportCode}
                  className={`px-3 py-1.5 rounded border text-xs font-medium flex items-center justify-between ${
                    r.overdue ? 'border-red-400 bg-red-50 text-red-700' : color
                  }`}
                >
                  <span>{r.regulator} — {r.reportName}</span>
                  {r.overdue && <span className="text-[10px] font-semibold ml-2">OVERDUE</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
