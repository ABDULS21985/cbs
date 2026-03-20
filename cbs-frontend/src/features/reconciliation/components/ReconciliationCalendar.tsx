import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NostroAccount } from '../api/reconciliationApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type DayStatus = 'reconciled' | 'partial' | 'not-reconciled' | 'weekend' | 'future' | 'empty';

interface DayCell {
  date: Date;
  dayOfMonth: number;
  status: DayStatus;
  reconciledCount: number;
  totalCount: number;
  isCurrentMonth: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<DayStatus, string> = {
  reconciled: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 border-green-200 dark:border-green-800',
  partial: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-800',
  'not-reconciled': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800',
  weekend: 'bg-muted/30 text-muted-foreground/50 border-transparent',
  future: 'bg-muted/10 text-muted-foreground/30 border-transparent',
  empty: 'border-transparent',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ReconciliationCalendarProps {
  accounts: NostroAccount[];
  historyMap: Record<string, Array<{ date: string; status: string; difference: number; matchedCount: number }>>;
}

export function ReconciliationCalendar({ accounts, historyMap }: ReconciliationCalendarProps) {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const totalAccounts = accounts.length;

  // Build a map of date -> { reconciled, total }
  const dateStats = useMemo(() => {
    const map: Record<string, { reconciled: number; total: number }> = {};

    Object.values(historyMap).forEach((history) => {
      history.forEach((h) => {
        const key = h.date.slice(0, 10);
        if (!map[key]) map[key] = { reconciled: 0, total: 0 };
        map[key].total += 1;
        if (h.status === 'COMPLETED') map[key].reconciled += 1;
      });
    });

    return map;
  }, [historyMap]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = daysInMonth[0].getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: DayCell[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        date: new Date(year, month, -(firstDayOfWeek - i - 1)),
        dayOfMonth: 0,
        status: 'empty',
        reconciledCount: 0,
        totalCount: 0,
        isCurrentMonth: false,
      });
    }

    // Actual days
    daysInMonth.forEach((date) => {
      const key = toDateKey(date);
      const stats = dateStats[key];
      const isFuture = date > today;

      let status: DayStatus;
      if (isFuture) {
        status = 'future';
      } else if (isWeekend(date)) {
        status = 'weekend';
      } else if (!stats || stats.total === 0) {
        status = 'not-reconciled';
      } else if (stats.reconciled >= totalAccounts) {
        status = 'reconciled';
      } else if (stats.reconciled > 0) {
        status = 'partial';
      } else {
        status = 'not-reconciled';
      }

      cells.push({
        date,
        dayOfMonth: date.getDate(),
        status,
        reconciledCount: stats?.reconciled ?? 0,
        totalCount: stats?.total ?? totalAccounts,
        isCurrentMonth: true,
      });
    });

    return cells;
  }, [year, month, dateStats, totalAccounts]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleDayClick = (cell: DayCell) => {
    if (!cell.isCurrentMonth || cell.status === 'future' || cell.status === 'empty') return;
    const dateStr = toDateKey(cell.date);
    navigate(`/accounts/reconciliation/workbench?date=${dateStr}`);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reconciliation Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center">{formatMonthYear(year, month)}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" /> Reconciled</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Partial</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Not Reconciled</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Weekend</span>
        </div>
      </div>

      {/* Grid */}
      <div className="p-5">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((cell, i) => (
            <div
              key={i}
              onClick={() => handleDayClick(cell)}
              title={
                cell.isCurrentMonth && cell.status !== 'empty' && cell.status !== 'future'
                  ? `${cell.reconciledCount}/${cell.totalCount} accounts reconciled`
                  : undefined
              }
              className={cn(
                'relative rounded-lg border p-2 min-h-[56px] text-xs transition-colors',
                cell.isCurrentMonth && cell.status !== 'future' && cell.status !== 'empty' && 'cursor-pointer',
                STATUS_COLORS[cell.status],
              )}
            >
              {cell.isCurrentMonth && cell.dayOfMonth > 0 && (
                <>
                  <span className="font-medium">{cell.dayOfMonth}</span>
                  {cell.status !== 'weekend' && cell.status !== 'future' && cell.status !== 'empty' && (
                    <p className="text-[10px] mt-0.5 opacity-80">
                      {cell.reconciledCount}/{cell.totalCount}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
