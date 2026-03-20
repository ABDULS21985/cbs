import { useState } from 'react';
import { X, Plus, Clock, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleType } from '../../api/reportBuilderApi';

interface ScheduleFormProps {
  schedule: ScheduleType;
  scheduleTime: string;
  scheduleDay: string;
  onScheduleChange: (s: ScheduleType) => void;
  onTimeChange: (t: string) => void;
  onDayChange: (d: string) => void;
  recipients: string[];
  onRecipientsChange: (r: string[]) => void;
  exportFormats: string[];
  onExportFormatsChange: (f: string[]) => void;
  onlyIfChanged: boolean;
  onOnlyIfChangedChange: (v: boolean) => void;
}

const FREQUENCY_OPTIONS: { value: ScheduleType; label: string; icon: string }[] = [
  { value: 'MANUAL', label: 'Once', icon: '1x' },
  { value: 'DAILY', label: 'Daily', icon: 'D' },
  { value: 'WEEKLY', label: 'Weekly', icon: 'W' },
  { value: 'MONTHLY', label: 'Monthly', icon: 'M' },
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

export function ScheduleForm({
  schedule,
  scheduleTime,
  scheduleDay,
  onScheduleChange,
  onTimeChange,
  onDayChange,
  recipients,
  onRecipientsChange,
  exportFormats,
  onExportFormatsChange,
  onlyIfChanged,
  onOnlyIfChangedChange,
}: ScheduleFormProps) {
  const [emailInput, setEmailInput] = useState('');

  function addEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed || recipients.includes(trimmed)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    onRecipientsChange([...recipients, trimmed]);
    setEmailInput('');
  }

  function removeEmail(email: string) {
    onRecipientsChange(recipients.filter((e) => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  }

  function toggleFormat(fmt: string) {
    if (exportFormats.includes(fmt)) {
      onExportFormatsChange(exportFormats.filter((f) => f !== fmt));
    } else {
      onExportFormatsChange([...exportFormats, fmt]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Frequency */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Frequency</label>
        <div className="grid grid-cols-4 gap-2">
          {FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onScheduleChange(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all',
                schedule === opt.value
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <span className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                schedule === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {opt.icon}
              </span>
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time picker */}
      {schedule !== 'MANUAL' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />
              Time
            </label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {schedule === 'WEEKLY' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Day of Week</label>
              <select
                value={scheduleDay}
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
                value={scheduleDay}
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

      {/* Export format checkboxes */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Export Format</label>
        <div className="flex gap-3">
          {[
            { value: 'PDF', label: 'PDF', icon: FileText },
            { value: 'EXCEL', label: 'Excel', icon: FileSpreadsheet },
          ].map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all',
                exportFormats.includes(value)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <input
                type="checkbox"
                checked={exportFormats.includes(value)}
                onChange={() => toggleFormat(value)}
                className="rounded border-gray-300 text-primary focus:ring-primary/30"
              />
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Recipients: tag input */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipients</label>
        <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[48px]">
          {recipients.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {email}
              <button onClick={() => removeEmail(email)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addEmail}
            placeholder={recipients.length === 0 ? 'Add email addresses...' : 'Add more...'}
            className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <button onClick={addEmail} className="text-muted-foreground hover:text-primary flex-shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add</p>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">Delivery Conditions</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyIfChanged}
            onChange={(e) => onOnlyIfChangedChange(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          <span className="text-sm">Only send if data has changed since last run</span>
        </label>
      </div>
    </div>
  );
}
