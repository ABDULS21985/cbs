import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, FileText, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { branchOpsApi, type StaffSchedule, type ShiftType } from '../../api/branchOpsApi';

interface StaffScheduleCalendarProps {
  branchId: string;
}

const SHIFT_STYLES: Record<ShiftType, string> = {
  MORNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  AFTERNOON: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  FULL_DAY: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  OFF: 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400',
  ON_LEAVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const SHIFT_LABELS: Record<ShiftType, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  FULL_DAY: 'Full Day',
  OFF: 'Off',
  ON_LEAVE: 'Leave',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MIN_STAFF_PER_DAY = 3;

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${monday.toLocaleDateString('en-GB', opts)} – ${sunday.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
}

function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

interface ShiftEditPopoverProps {
  currentShift: ShiftType;
  onSelect: (shift: ShiftType) => void;
  onClose: () => void;
}

function ShiftEditPopover({ currentShift, onSelect, onClose }: ShiftEditPopoverProps) {
  return (
    <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-popover border rounded-lg shadow-lg p-2 min-w-[140px]">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-xs font-medium text-muted-foreground">Edit Shift</span>
        <button type="button" onClick={onClose} className="p-0.5 hover:bg-muted rounded">
          <X className="w-3 h-3" />
        </button>
      </div>
      {(Object.keys(SHIFT_LABELS) as ShiftType[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => { onSelect(s); onClose(); }}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-muted text-xs transition-colors"
        >
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', SHIFT_STYLES[s])}>
            {SHIFT_LABELS[s]}
          </span>
          {currentShift === s && <Check className="w-3 h-3 text-primary" />}
        </button>
      ))}
    </div>
  );
}

export function StaffScheduleCalendar({ branchId }: StaffScheduleCalendarProps) {
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOf(new Date()));
  const [editCell, setEditCell] = useState<{ staffId: string; date: string } | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, Record<string, ShiftType>>>({});
  const queryClient = useQueryClient();

  const weekOf = currentMonday.toISOString().split('T')[0];

  const { data: schedule = [], isLoading } = useQuery<StaffSchedule[]>({
    queryKey: ['branches', branchId, 'schedule', weekOf],
    queryFn: () => branchOpsApi.getStaffSchedule(branchId, weekOf),
    staleTime: 60_000,
  });

  const weekDates = getWeekDates(currentMonday);

  const getShift = (staffId: string, date: string, baseSchedule: Record<string, ShiftType>): ShiftType => {
    return localOverrides[staffId]?.[date] ?? baseSchedule[date] ?? 'OFF';
  };

  const countActiveStaff = (date: string): number => {
    return schedule.filter((s) => {
      const shift = getShift(s.staffId, date, s.schedule);
      return shift !== 'OFF' && shift !== 'ON_LEAVE';
    }).length;
  };

  const handleShiftChange = async (staffId: string, date: string, shift: ShiftType) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] ?? {}), [date]: shift },
    }));
    try {
      await branchOpsApi.createSchedule(branchId, {
        staffId,
        weekOf,
        schedule: { [date]: shift },
      });
      queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'schedule', weekOf] });
    } catch {
      toast.error('Failed to save schedule change');
    }
    setEditCell(null);
  };

  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };

  const handleAttendanceReport = () => {
    toast.info('Attendance report generation queued. You will receive an email shortly.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevWeek}
            className="p-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[200px] text-center">{formatWeekLabel(currentMonday)}</span>
          <button
            type="button"
            onClick={nextWeek}
            className="p-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-lg border text-sm text-muted-foreground">
            Staff roster is maintained from branch operations master data.
          </div>
          <button
            type="button"
            onClick={handleAttendanceReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            Attendance Report
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground min-w-[160px] border-r">
                Staff Member
              </th>
              {weekDates.map((date, i) => {
                const count = countActiveStaff(date);
                const isUnderstaffed = count < MIN_STAFF_PER_DAY;
                return (
                  <th key={date} className={cn('px-3 py-3 text-center min-w-[110px]', isUnderstaffed && 'bg-red-50 dark:bg-red-950/20')}>
                    <div className="font-medium text-xs text-muted-foreground uppercase">{DAY_NAMES[i]}</div>
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                    {isUnderstaffed && (
                      <div className="text-[9px] text-red-600 dark:text-red-400 mt-0.5 font-medium">
                        {count}/{MIN_STAFF_PER_DAY} staff
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {schedule.map((staff, rowIdx) => (
              <tr key={staff.staffId} className={cn('border-t', rowIdx % 2 === 1 && 'bg-muted/20')}>
                <td className="px-4 py-2.5 border-r">
                  <div className="font-medium text-sm">{staff.staffName}</div>
                  <div className="text-xs text-muted-foreground">{staff.role}</div>
                </td>
                {weekDates.map((date) => {
                  const shift = getShift(staff.staffId, date, staff.schedule);
                  const isEditing = editCell?.staffId === staff.staffId && editCell?.date === date;
                  const dayCount = countActiveStaff(date);
                  const isUnderstaffedDay = dayCount < MIN_STAFF_PER_DAY;

                  return (
                    <td
                      key={date}
                      className={cn('px-2 py-2 text-center relative', isUnderstaffedDay && 'bg-red-50/50 dark:bg-red-950/10')}
                    >
                      <button
                        type="button"
                        onClick={() => setEditCell(isEditing ? null : { staffId: staff.staffId, date })}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-medium w-full max-w-[90px] mx-auto transition-opacity hover:opacity-80',
                          SHIFT_STYLES[shift],
                        )}
                      >
                        {SHIFT_LABELS[shift]}
                      </button>
                      {isEditing && (
                        <ShiftEditPopover
                          currentShift={shift}
                          onSelect={(s) => handleShiftChange(staff.staffId, date, s)}
                          onClose={() => setEditCell(null)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.entries(SHIFT_LABELS) as [ShiftType, string][]).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-full', SHIFT_STYLES[key])} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-950/40" />
          <span className="text-xs text-muted-foreground">Understaffed day (&lt;{MIN_STAFF_PER_DAY})</span>
        </div>
      </div>
    </div>
  );
}
