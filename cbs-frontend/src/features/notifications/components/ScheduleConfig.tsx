import { useState, useMemo } from 'react';
import { Clock, Calendar, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScheduleResult {
  mode: 'now' | 'once' | 'recurring';
  scheduledAt?: string;
  cronExpression?: string;
  frequency?: string;
  nextRuns?: string[];
}

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function generateCron(frequency: string, time: string, dayOfWeek: string, dayOfMonth: number): string {
  const [hour, minute] = time.split(':').map(Number);
  switch (frequency) {
    case 'DAILY': return `${minute} ${hour} * * *`;
    case 'WEEKLY': return `${minute} ${hour} * * ${dayOfWeek}`;
    case 'MONTHLY': return `${minute} ${hour} ${dayOfMonth} * *`;
    default: return `${minute} ${hour} * * *`;
  }
}

function getNextRuns(mode: string, scheduledAt: string, cron: string, count = 5): string[] {
  if (mode === 'once' && scheduledAt) return [scheduledAt];
  // Simple next run approximation for display purposes
  const runs: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    if (mode === 'recurring') {
      d.setDate(d.getDate() + (i + 1));
    }
    runs.push(d.toISOString());
  }
  return runs;
}

export function ScheduleConfig({ value, onChange }: { value: ScheduleResult; onChange: (v: ScheduleResult) => void }) {
  const [mode, setMode] = useState<'now' | 'once' | 'recurring'>(value.mode);
  const [date, setDate] = useState(value.scheduledAt?.slice(0, 10) ?? '');
  const [time, setTime] = useState(value.scheduledAt?.slice(11, 16) ?? '09:00');
  const [frequency, setFrequency] = useState(value.frequency ?? 'DAILY');
  const [dayOfWeek, setDayOfWeek] = useState('MON');
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const fc = 'px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleModeChange = (m: 'now' | 'once' | 'recurring') => {
    setMode(m);
    if (m === 'now') {
      onChange({ mode: 'now' });
    }
  };

  const handleOnceChange = (newDate: string, newTime: string) => {
    setDate(newDate);
    setTime(newTime);
    const scheduledAt = `${newDate}T${newTime}:00`;
    onChange({ mode: 'once', scheduledAt, nextRuns: [scheduledAt] });
  };

  const handleRecurringChange = (f: string, t: string, dow: string, dom: number) => {
    setFrequency(f);
    setTime(t);
    setDayOfWeek(dow);
    setDayOfMonth(dom);
    const cron = generateCron(f, t, dow, dom);
    const nextRuns = getNextRuns('recurring', '', cron);
    onChange({ mode: 'recurring', cronExpression: cron, frequency: f, nextRuns });
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {([
          { id: 'now' as const, label: 'Send Now', icon: Clock },
          { id: 'once' as const, label: 'Schedule Once', icon: Calendar },
          { id: 'recurring' as const, label: 'Recurring', icon: RotateCw },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => handleModeChange(id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
              mode === id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* One-time schedule */}
      {mode === 'once' && (
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Scheduled Delivery</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" value={date} onChange={(e) => handleOnceChange(e.target.value, time)}
                min={new Date().toISOString().slice(0, 10)} className={cn(fc, 'w-full mt-1')} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Time</label>
              <input type="time" value={time} onChange={(e) => handleOnceChange(date, e.target.value)}
                className={cn(fc, 'w-full mt-1')} /></div>
          </div>
        </div>
      )}

      {/* Recurring schedule */}
      {mode === 'recurring' && (
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Recurring Schedule</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Frequency</label>
              <select value={frequency} onChange={(e) => handleRecurringChange(e.target.value, time, dayOfWeek, dayOfMonth)}
                className={cn(fc, 'w-full mt-1')}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Time</label>
              <input type="time" value={time} onChange={(e) => handleRecurringChange(frequency, e.target.value, dayOfWeek, dayOfMonth)}
                className={cn(fc, 'w-full mt-1')} /></div>
          </div>
          {frequency === 'WEEKLY' && (
            <div><label className="text-xs font-medium text-muted-foreground">Day of Week</label>
              <div className="flex gap-1 mt-1">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d} onClick={() => { setDayOfWeek(d); handleRecurringChange(frequency, time, d, dayOfMonth); }}
                    className={cn('px-2 py-1 text-xs rounded', dayOfWeek === d ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          {frequency === 'MONTHLY' && (
            <div><label className="text-xs font-medium text-muted-foreground">Day of Month</label>
              <input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => { setDayOfMonth(Number(e.target.value)); handleRecurringChange(frequency, time, dayOfWeek, Number(e.target.value)); }}
                className={cn(fc, 'w-20 mt-1')} /></div>
          )}
          {value.cronExpression && (
            <div className="rounded bg-muted p-2">
              <p className="text-[10px] text-muted-foreground">Cron Expression</p>
              <p className="font-mono text-xs">{value.cronExpression}</p>
            </div>
          )}
          {value.nextRuns && value.nextRuns.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Next scheduled runs:</p>
              <div className="space-y-0.5">
                {value.nextRuns.slice(0, 5).map((run, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{new Date(run).toLocaleString()}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
