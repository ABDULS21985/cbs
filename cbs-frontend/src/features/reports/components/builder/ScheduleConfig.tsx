import { cn } from '@/lib/utils';
import type { ScheduleType } from '../../api/reportBuilderApi';

interface ScheduleConfigProps {
  schedule: ScheduleType;
  scheduleTime?: string;
  scheduleDay?: string;
  onScheduleChange: (s: ScheduleType) => void;
  onTimeChange: (t: string) => void;
  onDayChange: (d: string) => void;
}

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string; description: string }[] = [
  { value: 'MANUAL', label: 'Manual', description: 'Run only when triggered manually' },
  { value: 'DAILY', label: 'Daily', description: 'Run once every day' },
  { value: 'WEEKLY', label: 'Weekly', description: 'Run once a week on chosen day' },
  { value: 'MONTHLY', label: 'Monthly', description: 'Run once a month on chosen date' },
];

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

export function ScheduleConfig({ schedule, scheduleTime, scheduleDay, onScheduleChange, onTimeChange, onDayChange }: ScheduleConfigProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SCHEDULE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onScheduleChange(opt.value)}
            className={cn(
              'flex flex-col items-start p-3.5 rounded-xl border text-left transition-all',
              schedule === opt.value
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
            )}
          >
            <div className="text-sm font-semibold">{opt.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>

      {schedule !== 'MANUAL' && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time</label>
            <input
              type="time"
              value={scheduleTime ?? '08:00'}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {schedule === 'WEEKLY' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Day of Week</label>
              <select
                value={scheduleDay ?? 'MON'}
                onChange={(e) => onDayChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {schedule === 'MONTHLY' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Day of Month</label>
              <select
                value={scheduleDay ?? '1'}
                onChange={(e) => onDayChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {DAYS_OF_MONTH.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
