import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useAdvisorReviews, useScheduleReview, useAdvisorClients } from '../../hooks/useWealth';
import type { AdvisorReview } from '../../api/wealthApi';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorCalendarProps {
  advisorId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const REVIEW_TYPES = ['ANNUAL_REVIEW', 'MID_YEAR', 'AD_HOC'] as const;

const STATUS_DOT_COLORS: Record<AdvisorReview['status'], string> = {
  OVERDUE: 'bg-red-500',
  SCHEDULED: 'bg-blue-500',
  CONFIRMED: 'bg-green-500',
  COMPLETED: 'bg-gray-400',
};

const STATUS_CARD_STYLES: Record<AdvisorReview['status'], string> = {
  OVERDUE: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  SCHEDULED: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  CONFIRMED: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
  COMPLETED: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: number; month: 'prev' | 'current' | 'next'; fullDate: string }[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    days.push({
      date: d,
      month: 'prev',
      fullDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: d,
      month: 'current',
      fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // Next month padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    days.push({
      date: d,
      month: 'next',
      fullDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  return days;
}

function getDateString(dateTime: string): string {
  return dateTime.split('T')[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorCalendar({ advisorId }: AdvisorCalendarProps) {
  const { data: reviews = [], isLoading } = useAdvisorReviews(advisorId);
  const { data: clients = [] } = useAdvisorClients(advisorId);
  const scheduleMutation = useScheduleReview(advisorId);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form state
  const [formClient, setFormClient] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formType, setFormType] = useState<string>(REVIEW_TYPES[0]);
  const [formNotes, setFormNotes] = useState('');

  // Build review map: date -> reviews
  const reviewsByDate = useMemo(() => {
    const map: Record<string, AdvisorReview[]> = {};
    for (const review of reviews) {
      const dateKey = getDateString(review.dateTime);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(review);
    }
    return map;
  }, [reviews]);

  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Selected day reviews
  const selectedReviews = selectedDate ? reviewsByDate[selectedDate] || [] : [];

  function navigateMonth(delta: number) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDate(null);
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!formClient || !formDate || !formTime || !formType) return;

    const selectedClientObj = clients.find((c) => c.id === formClient);
    const clientName = selectedClientObj?.clientName || '';
    const planCode = selectedClientObj?.planCode || '';

    await scheduleMutation.mutateAsync({
      clientName,
      planCode,
      dateTime: `${formDate}T${formTime}:00`,
      reviewType: formType as AdvisorReview['reviewType'],
      notes: formNotes || undefined,
    });

    setFormClient('');
    setFormDate('');
    setFormTime('09:00');
    setFormType(REVIEW_TYPES[0]);
    setFormNotes('');
    setShowScheduleModal(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-semibold min-w-[160px] text-center">{monthLabel}</h3>
          <button
            onClick={() => navigateMonth(1)}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Review
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {(['OVERDUE', 'SCHEDULED', 'CONFIRMED', 'COMPLETED'] as const).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_DOT_COLORS[status])} />
            <span className="text-muted-foreground capitalize">{status.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Day names header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_NAMES.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayReviews = reviewsByDate[day.fullDate] || [];
            const isToday = day.fullDate === todayStr;
            const isSelected = day.fullDate === selectedDate;
            const isCurrentMonth = day.month === 'current';

            // Unique statuses for dots
            const statuses = [...new Set(dayReviews.map((r) => r.status))];

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day.fullDate)}
                className={cn(
                  'relative h-16 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50',
                  !isCurrentMonth && 'opacity-40',
                  isSelected && 'bg-primary/5 ring-1 ring-primary/30',
                  isToday && 'bg-blue-50/50 dark:bg-blue-900/10',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    isToday &&
                      'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center',
                  )}
                >
                  {day.date}
                </span>
                {/* Status dots */}
                {statuses.length > 0 && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {statuses.map((status) => (
                      <span
                        key={status}
                        className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT_COLORS[status])}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Reviews */}
      {selectedDate && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">
            Reviews for {formatDate(selectedDate)}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({selectedReviews.length} review{selectedReviews.length !== 1 ? 's' : ''})
            </span>
          </h4>

          {selectedReviews.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reviews scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedReviews.map((review) => {
                const time = new Date(review.dateTime).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={review.id}
                    className={cn(
                      'rounded-xl border p-4 flex items-start gap-3',
                      STATUS_CARD_STYLES[review.status],
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-full min-h-[2rem] rounded-full shrink-0',
                        STATUS_DOT_COLORS[review.status],
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{review.clientName}</p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                            review.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : review.status === 'CONFIRMED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : review.status === 'SCHEDULED'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          {review.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{review.planCode}</span>
                        {' · '}
                        {review.reviewType.replace(/_/g, ' ')}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {time}
                      </div>
                      {review.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">
                          {review.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Review Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Schedule Review</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Client *
                </label>
                <select
                  required
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ({c.planCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                    Time *
                  </label>
                  <input
                    required
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Review Type *
                </label>
                <select
                  required
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {REVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                    scheduleMutation.isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90',
                  )}
                >
                  {scheduleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
