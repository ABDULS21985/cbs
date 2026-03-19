import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange { from?: Date; to?: Date; }

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

const presets = [
  { label: 'Today', fn: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Last 7 days', fn: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Last 30 days', fn: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'This month', fn: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'This quarter', fn: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: 'This year', fn: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({ value, onChange, disabled }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayText = value.from && value.to
    ? `${format(value.from, 'dd MMM')} — ${format(value.to, 'dd MMM yyyy')}`
    : 'Select dates';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn('flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors', disabled && 'opacity-50')}
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span>{displayText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-lg border bg-popover shadow-lg z-50 py-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => { onChange(preset.fn()); setOpen(false); }}
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              {preset.label}
            </button>
          ))}
          <div className="border-t mt-1 pt-1 px-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <input type="date" value={value.from ? format(value.from, 'yyyy-MM-dd') : ''} onChange={(e) => onChange({ ...value, from: e.target.value ? new Date(e.target.value) : undefined })} className="w-full mt-0.5 text-xs rounded border px-2 py-1 bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <input type="date" value={value.to ? format(value.to, 'yyyy-MM-dd') : ''} onChange={(e) => { onChange({ ...value, to: e.target.value ? new Date(e.target.value) : undefined }); setOpen(false); }} className="w-full mt-0.5 text-xs rounded border px-2 py-1 bg-background" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
