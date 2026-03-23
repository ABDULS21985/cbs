import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Moon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = [
  { key: 'MON', label: 'M' },
  { key: 'TUE', label: 'T' },
  { key: 'WED', label: 'W' },
  { key: 'THU', label: 'T' },
  { key: 'FRI', label: 'F' },
  { key: 'SAT', label: 'S' },
  { key: 'SUN', label: 'S' },
];

export function QuietHoursConfig() {
  const [enabled, setEnabled] = useState(false);
  const [fromTime, setFromTime] = useState('22:00');
  const [toTime, setToTime] = useState('07:00');
  const [criticalBypass, setCriticalBypass] = useState(true);
  const [activeDays, setActiveDays] = useState<Set<string>>(new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']));

  const toggleDay = (day: string) => {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const handleSave = () => {
    toast.success('Quiet hours preferences saved');
  };

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Moon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Do Not Disturb</p>
            <p className="text-xs text-muted-foreground">Pause non-critical notifications during quiet hours</p>
          </div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            enabled ? 'bg-indigo-500' : 'bg-muted-foreground/20',
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'left-[22px]' : 'left-0.5',
          )} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 pl-13">
          {/* Time Range */}
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="block mt-1 h-8 px-2 text-sm rounded-lg border bg-background" />
            </div>
            <span className="text-xs text-muted-foreground mt-5">to</span>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="block mt-1 h-8 px-2 text-sm rounded-lg border bg-background" />
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Active Days</label>
            <div className="flex gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={cn(
                    'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                    activeDays.has(day.key)
                      ? 'bg-indigo-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Critical Bypass */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={criticalBypass}
              onChange={(e) => setCriticalBypass(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Except for critical alerts (security, fraud)</span>
          </label>

          <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              During quiet hours, only IN_APP notifications will be delivered. Email, SMS, and Push notifications will be held until quiet hours end.
            </p>
          </div>

          <button onClick={handleSave} className="px-4 py-2 text-sm btn-primary">Save Quiet Hours</button>
        </div>
      )}
    </div>
  );
}
