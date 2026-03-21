import { useState, useMemo } from 'react';
import { X, Clock, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createScheduledNotification, type NotificationTemplate, type NotificationChannel } from '../../api/notificationAdminApi';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

interface ScheduleCreatorProps {
  templates: NotificationTemplate[];
  onClose: () => void;
  onSuccess: () => void;
}

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

function buildCron(frequency: Frequency, time: string, dayOfWeek?: number, dayOfMonth?: number): string {
  const [h, m] = time.split(':').map(Number);
  if (frequency === 'DAILY') return `${m} ${h} * * *`;
  if (frequency === 'WEEKLY') return `${m} ${h} * * ${dayOfWeek ?? 1}`;
  return `${m} ${h} ${dayOfMonth ?? 1} * *`;
}

function getNextRuns(frequency: Frequency, time: string, count = 5): string[] {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const runs: string[] = [];
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (next <= now) {
    if (frequency === 'DAILY') next = addDays(next, 1);
    else if (frequency === 'WEEKLY') next = addWeeks(next, 1);
    else next = addMonths(next, 1);
  }
  for (let i = 0; i < count; i++) {
    runs.push(format(next, 'EEE, dd MMM yyyy HH:mm'));
    if (frequency === 'DAILY') next = addDays(next, 1);
    else if (frequency === 'WEEKLY') next = addWeeks(next, 1);
    else next = addMonths(next, 1);
  }
  return runs;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ScheduleCreator({ templates, onClose, onSuccess }: ScheduleCreatorProps) {
  const [name, setName] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('DAILY');
  const [time, setTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recipientCriteria, setRecipientCriteria] = useState('ALL_ACTIVE');
  const [creating, setCreating] = useState(false);

  const selectedTemplate = templates.find(t => t.templateCode === templateCode);
  const channel: NotificationChannel = selectedTemplate?.channel || 'EMAIL';
  const cron = buildCron(frequency, time, dayOfWeek, dayOfMonth);
  const nextRuns = useMemo(() => getNextRuns(frequency, time), [frequency, time]);

  const canSubmit = name.trim() && templateCode;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      await createScheduledNotification({
        name,
        templateCode,
        channel,
        cronExpression: cron,
        frequency,
        recipientCriteria: { criteria: recipientCriteria },
      });
      toast.success('Scheduled notification created');
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Create Scheduled Notification</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Daily Transaction Summary"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Template <span className="text-red-500">*</span>
              </label>
              <select
                value={templateCode}
                onChange={e => setTemplateCode(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select template...</option>
                {templates.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.templateCode}>
                    {t.templateName} ({t.channel})
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Channel: {selectedTemplate.channel} · Event: {selectedTemplate.eventType}
                </p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Frequency</label>
              <div className="flex gap-2">
                {(['DAILY', 'WEEKLY', 'MONTHLY'] as Frequency[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-xs font-medium transition-colors',
                      frequency === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted',
                    )}
                  >
                    {f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Day of week (for WEEKLY) */}
            {frequency === 'WEEKLY' && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Day of Week</label>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfWeek(i)}
                      className={cn(
                        'flex-1 py-2 rounded-md text-xs font-medium transition-colors',
                        dayOfWeek === i
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of month (for MONTHLY) */}
            {frequency === 'MONTHLY' && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Day of Month</label>
                <input
                  type="number"
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value))}
                  min={1}
                  max={28}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipients</label>
              <select
                value={recipientCriteria}
                onChange={e => setRecipientCriteria(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ALL_ACTIVE">All Active Customers</option>
                <option value="SEGMENT_PREMIUM">Premium Segment</option>
                <option value="SEGMENT_RETAIL">Retail Segment</option>
                <option value="SEGMENT_CORPORATE">Corporate Segment</option>
              </select>
            </div>

            {/* Cron display */}
            <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">Cron: {cron}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Next 5 runs:</p>
                <ul className="space-y-0.5">
                  {nextRuns.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!canSubmit || creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Schedule
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
