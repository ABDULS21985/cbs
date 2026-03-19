import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Loader2, Calendar, DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';
import { addDays, addWeeks, addMonths, parseISO, isBefore } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getRecurringDepositById } from '../api/goalApi';
import type { RecurringDeposit } from '../api/goalApi';

interface Installment {
  number: number;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  status: 'PAID' | 'OVERDUE' | 'UPCOMING';
}

function generateSchedule(rd: RecurringDeposit): Installment[] {
  const start = parseISO(rd.startDate);
  const today = new Date();
  return Array.from({ length: rd.totalInstallments }, (_, i) => {
    let dueDate: Date;
    if (rd.frequency === 'DAILY') dueDate = addDays(start, i);
    else if (rd.frequency === 'WEEKLY') dueDate = addWeeks(start, i);
    else dueDate = addMonths(start, i);

    const isPaid = i < rd.installmentsPaid;
    const isOverdue = !isPaid && isBefore(dueDate, today) && rd.status !== 'COMPLETED';

    return {
      number: i + 1,
      dueDate: dueDate.toISOString(),
      paidDate: isPaid ? addDays(dueDate, Math.floor(Math.random() * 3)).toISOString() : null,
      amount: rd.amount,
      status: isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'UPCOMING',
    };
  });
}

const installmentStatusColors: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UPCOMING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function RecurringDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: rd, isLoading } = useQuery({
    queryKey: ['recurring-deposit', id],
    queryFn: () => getRecurringDepositById(id!),
    enabled: !!id,
  });

  const schedule = useMemo(() => (rd ? generateSchedule(rd) : []), [rd]);

  const columns = useMemo<ColumnDef<Installment, unknown>[]>(
    () => [
      {
        accessorKey: 'number',
        header: '#',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm tabular-nums">#{getValue() as number}</span>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatDate(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'paidDate',
        header: 'Paid Date',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          return v ? (
            <span className="text-sm">{formatDate(v)}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="tabular-nums font-medium">{formatMoney(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return (
            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', installmentStatusColors[status])}>
              {status}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading deposit details...
      </div>
    );
  }

  if (!rd) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <RefreshCw className="w-10 h-10 opacity-30" />
        <p className="font-medium">Recurring deposit not found</p>
        <button
          onClick={() => navigate('/accounts/recurring-deposits')}
          className="text-primary text-sm hover:underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  const pct = Math.round((rd.installmentsPaid / rd.totalInstallments) * 100);
  const totalPaid = rd.installmentsPaid * rd.amount;
  const totalExpected = rd.totalInstallments * rd.amount;
  const overdueCount = schedule.filter((s) => s.status === 'OVERDUE').length;

  return (
    <>
      <PageHeader
        title={`Recurring Deposit — ${id}`}
        subtitle={`${rd.customerName} · ${rd.frequency.charAt(0) + rd.frequency.slice(1).toLowerCase()} plan`}
        backTo="/accounts/recurring-deposits"
      />

      <div className="page-container space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <DollarSign className="w-3.5 h-3.5" /> Installment
            </div>
            <div className="stat-value text-base">{formatMoney(rd.amount)}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <RefreshCw className="w-3.5 h-3.5" /> Frequency
            </div>
            <div className="stat-value text-base capitalize">{rd.frequency.toLowerCase()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Progress</div>
            <div className="stat-value text-base">{rd.installmentsPaid} / {rd.totalInstallments}</div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="stat-change text-muted-foreground">{pct}% complete</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <Calendar className="w-3.5 h-3.5" /> Next Due
            </div>
            <div className={cn('stat-value text-base', rd.status === 'MISSED' && 'text-red-600 dark:text-red-400')}>
              {rd.status === 'COMPLETED' ? '—' : formatDate(rd.nextDueDate)}
            </div>
            <div className="mt-0.5">
              <StatusBadge status={rd.status} dot />
            </div>
          </div>
        </div>

        {/* Penalty section */}
        {rd.penalty && rd.penalty > 0 && (
          <div className="flex items-start gap-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Penalty Incurred</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                A penalty of <strong>{formatMoney(rd.penalty)}</strong> has been applied due to{' '}
                {overdueCount} missed installment{overdueCount !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold">Payment Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatMoney(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Expected</span>
              <span className="font-medium tabular-nums">{formatMoney(totalExpected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium tabular-nums">{formatMoney(Math.max(totalExpected - totalPaid, 0))}</span>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold">Plan Details</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Start Date</span>
              <span>{formatDate(rd.startDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer ID</span>
              <span className="font-mono text-xs">{rd.customerId}</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overdue</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">{overdueCount} installment{overdueCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Installment schedule */}
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Installment Schedule</h2>
          <DataTable
            columns={columns}
            data={schedule}
            enableGlobalFilter
            pageSize={12}
            emptyMessage="No installments found"
          />
        </div>
      </div>
    </>
  );
}
