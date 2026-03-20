import { useEffect, useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiPost } from '@/lib/api';
import { useTradeConfirmations, useSettlementFails } from '../hooks/useTreasuryData';
import type { ColumnDef } from '@tanstack/react-table';
import type { TradeConfirmation, SettlementFail } from '../types/treasury';
import { cn } from '@/lib/utils';
import { FileCheck, AlertTriangle, XCircle, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysDiff(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const CURRENCY_COLORS: Record<string, string> = {
  NGN: 'bg-green-100 text-green-800',
  USD: 'bg-blue-100 text-blue-800',
  EUR: 'bg-purple-100 text-purple-800',
  GBP: 'bg-yellow-100 text-yellow-800',
  JPY: 'bg-pink-100 text-pink-800',
};
const DEFAULT_CURRENCY_COLOR = 'bg-slate-100 text-slate-700';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ─── Confirmations sub-component ──────────────────────────────────────────────

type ConfFilter = 'ALL' | 'MATCHED' | 'UNMATCHED' | 'PENDING';

interface ConfirmationsTabProps {
  confirmations: TradeConfirmation[];
  isLoading: boolean;
}

function ConfirmationsTab({ confirmations, isLoading }: ConfirmationsTabProps) {
  const [confFilter, setConfFilter] = useState<ConfFilter>('ALL');
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/v1/treasury/confirmations/${id}/confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'confirmations'] });
      toast.success('Trade confirmation submitted successfully.');
    },
    onError: () => {
      toast.error('Failed to confirm trade. Please try again.');
    },
  });

  const filtered = useMemo(() => {
    if (confFilter === 'ALL') return confirmations;
    if (confFilter === 'PENDING') return confirmations.filter((c) => c.status === 'PENDING');
    return confirmations.filter((c) => c.matchStatus === confFilter);
  }, [confirmations, confFilter]);

  const FILTER_BUTTONS: { label: string; value: ConfFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Matched', value: 'MATCHED' },
    { label: 'Unmatched', value: 'UNMATCHED' },
    { label: 'Pending', value: 'PENDING' },
  ];

  const confirmCols: ColumnDef<TradeConfirmation, any>[] = [
    {
      accessorKey: 'confirmRef',
      header: 'Ref',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.confirmRef}</span>,
    },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    { accessorKey: 'instrument', header: 'Instrument' },
    {
      accessorKey: 'direction',
      header: 'Side',
      cell: ({ row }) => (
        <span className={cn('text-xs font-bold', row.original.direction === 'BUY' ? 'text-green-600' : 'text-red-600')}>
          {row.original.direction}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.amount.toLocaleString()}</span>,
    },
    {
      accessorKey: 'valueDate',
      header: 'Value Date',
      cell: ({ row }) => {
        const diff = daysDiff(row.original.valueDate);
        const cls =
          diff <= 0
            ? 'text-foreground'
            : diff === 1
              ? 'text-amber-600 font-semibold'
              : 'text-red-600 font-semibold';
        return <span className={cn('font-mono text-sm', cls)}>{formatDate(row.original.valueDate)}</span>;
      },
    },
    {
      id: 'aging',
      header: 'Aging',
      cell: ({ row }) => {
        const diff = daysDiff(row.original.valueDate);
        if (diff > 0) {
          const cls = diff === 1 ? 'text-amber-600' : 'text-red-600';
          return <span className={cn('text-xs font-mono', cls)}>T+{diff}</span>;
        }
        if (diff === 0) return <span className="text-xs text-green-600 font-mono">Today</span>;
        return <span className="text-xs text-slate-400 font-mono">{diff}d ago</span>;
      },
    },
    {
      accessorKey: 'matchStatus',
      header: 'Match',
      cell: ({ row }) => {
        const ms = row.original.matchStatus;
        if (ms === 'MATCHED') {
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
              MATCHED
            </span>
          );
        }
        if (ms === 'UNMATCHED') {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                UNMATCHED
              </span>
              <button
                className="px-2 py-1 text-xs rounded-md border hover:bg-muted"
                onClick={() =>
                  toast.info(`Investigating unmatched confirmation: ${row.original.confirmRef}`, { duration: 4000 })
                }
              >
                Investigate
              </button>
            </span>
          );
        }
        // ALLEGED or other
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
            {ms}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isPending = row.original.status === 'PENDING';
        return (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status={row.original.status} dot />
            {isPending && (
              <button
                className="px-2 py-1 text-xs rounded-md border hover:bg-muted disabled:opacity-50"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate(row.original.id)}
              >
                Confirm
              </button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-3">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {FILTER_BUTTONS.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setConfFilter(btn.value)}
            className={cn(
              'px-3 py-1 text-xs rounded-md border transition-colors',
              confFilter === btn.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted border-border',
            )}
          >
            {btn.label}
            {btn.value !== 'ALL' && (
              <span className="ml-1.5 font-mono">
                (
                {btn.value === 'PENDING'
                  ? confirmations.filter((c) => c.status === 'PENDING').length
                  : confirmations.filter((c) => c.matchStatus === btn.value).length}
                )
              </span>
            )}
          </button>
        ))}
      </div>
      <DataTable columns={confirmCols} data={filtered} isLoading={isLoading} enableGlobalFilter />
    </div>
  );
}

// ─── Settlement Fails sub-component ───────────────────────────────────────────

interface FailsTabProps {
  fails: SettlementFail[];
  isLoading: boolean;
}

type ResolveState = { open: boolean; reasonCode: string };

function FailsTab({ fails, isLoading }: FailsTabProps) {
  const queryClient = useQueryClient();
  const [resolveMap, setResolveMap] = useState<Record<number, ResolveState>>({});

  const escalateMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/v1/open-items/${id}/escalate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'settlement-fails'] });
      toast.success('Fail escalated successfully.');
    },
    onError: () => toast.error('Failed to escalate. Please try again.'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, reasonCode }: { id: number; reasonCode: string }) =>
      apiPost(`/api/v1/open-items/${id}/resolve`, { reasonCode }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'settlement-fails'] });
      setResolveMap((prev) => ({ ...prev, [variables.id]: { open: false, reasonCode: '' } }));
      toast.success('Settlement fail resolved.');
    },
    onError: () => toast.error('Failed to resolve. Please try again.'),
  });

  const toggleResolve = (id: number) => {
    setResolveMap((prev) => ({
      ...prev,
      [id]: { open: !prev[id]?.open, reasonCode: prev[id]?.reasonCode ?? '' },
    }));
  };

  const setReasonCode = (id: number, val: string) => {
    setResolveMap((prev) => ({ ...prev, [id]: { ...prev[id], reasonCode: val } }));
  };

  // By-counterparty summary
  const byCounterparty = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number }> = {};
    for (const f of fails) {
      if (!map[f.counterparty]) map[f.counterparty] = { count: 0, totalValue: 0 };
      map[f.counterparty].count += 1;
      map[f.counterparty].totalValue += f.amount;
    }
    return Object.entries(map)
      .map(([counterparty, stats]) => ({ counterparty, ...stats }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [fails]);

  const failCols: ColumnDef<SettlementFail, any>[] = [
    {
      accessorKey: 'failRef',
      header: 'Fail #',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-red-600">{row.original.failRef}</span>
      ),
    },
    { accessorKey: 'instrument', header: 'Instrument' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span>,
    },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    {
      accessorKey: 'failSince',
      header: 'Fail Since',
      cell: ({ row }) => formatDate(row.original.failSince),
    },
    {
      accessorKey: 'agingDays',
      header: 'Days',
      cell: ({ row }) => {
        const d = row.original.agingDays;
        const cls =
          d <= 2 ? 'text-green-600' : d <= 5 ? 'text-amber-600' : 'text-red-600';
        return <span className={cn('font-mono text-sm font-bold', cls)}>{d}</span>;
      },
    },
    {
      accessorKey: 'penaltyAccrued',
      header: 'Penalty',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-red-600">{formatMoney(row.original.penaltyAccrued)}</span>
      ),
    },
    { accessorKey: 'escalation', header: 'Escalation' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const resolveState = resolveMap[item.id];
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              {item.agingDays > 3 && (
                <button
                  className="px-2 py-1 text-xs rounded-md border hover:bg-muted disabled:opacity-50 text-amber-700 border-amber-300"
                  disabled={escalateMutation.isPending}
                  onClick={() => escalateMutation.mutate(item.id)}
                >
                  Escalate
                </button>
              )}
              <button
                className="px-2 py-1 text-xs rounded-md border hover:bg-muted"
                onClick={() => toggleResolve(item.id)}
              >
                {resolveState?.open ? 'Cancel' : 'Resolve'}
              </button>
            </div>
            {resolveState?.open && (
              <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-2">
                <select
                  className="rounded border text-xs px-1.5 py-1 bg-background"
                  value={resolveState.reasonCode}
                  onChange={(e) => setReasonCode(item.id, e.target.value)}
                >
                  <option value="">-- Reason --</option>
                  <option value="SETTLED_LATE">Settled Late</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="BOUGHT_IN">Bought-In</option>
                  <option value="BILATERAL_CANCEL">Bilateral Cancel</option>
                  <option value="OTHER">Other</option>
                </select>
                <button
                  className="px-2 py-1 text-xs rounded-md border hover:bg-muted disabled:opacity-50"
                  disabled={!resolveState.reasonCode || resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({ id: item.id, reasonCode: resolveState.reasonCode })
                  }
                >
                  Confirm Resolve
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <DataTable
        columns={failCols}
        data={fails}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="settlement-fails"
      />

      {/* By-Counterparty Summary */}
      {byCounterparty.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Fails by Counterparty</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Counterparty</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Fails</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byCounterparty.map((row) => (
                  <tr key={row.counterparty} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.counterparty}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={cn('font-semibold', row.count > 2 ? 'text-red-600' : 'text-amber-600')}>
                        {row.count}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">{formatMoney(row.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settlement Calendar sub-component ────────────────────────────────────────

interface CalendarTabProps {
  confirmations: TradeConfirmation[];
}

function SettlementCalendarTab({ confirmations }: CalendarTabProps) {
  const monday = getMondayOfCurrentWeek();
  const weekDays = DAY_LABELS.map((label, i) => ({
    label,
    date: addDays(monday, i),
    ymd: toYMD(addDays(monday, i)),
  }));

  // Group confirmations by valueDate (YYYY-MM-DD)
  const byDate = useMemo(() => {
    const map: Record<string, TradeConfirmation[]> = {};
    for (const c of confirmations) {
      const key = c.valueDate?.slice(0, 10);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [confirmations]);

  const today = toYMD(new Date());

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          Week of{' '}
          {monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {weekDays.map(({ label, date, ymd }) => {
          const items = byDate[ymd] ?? [];
          const isToday = ymd === today;
          return (
            <div
              key={ymd}
              className={cn(
                'rounded-lg border p-2 min-h-[140px] space-y-1.5 flex flex-col',
                isToday ? 'border-primary bg-primary/5' : 'border-border bg-card',
              )}
            >
              {/* Day header */}
              <div className="text-center mb-1">
                <p className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </p>
                <p className={cn('text-sm font-bold', isToday ? 'text-primary' : 'text-foreground')}>
                  {date.getDate()}
                </p>
              </div>

              {/* Items */}
              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">—</div>
              ) : (
                <div className="space-y-1 flex-1">
                  {items.map((conf) => {
                    // Derive currency from instrument heuristic or fall back to unknown
                    const currMatch = conf.instrument?.match(/[A-Z]{3}$/);
                    const currency = currMatch ? currMatch[0] : 'USD';
                    const colorCls = CURRENCY_COLORS[currency] ?? DEFAULT_CURRENCY_COLOR;
                    return (
                      <div
                        key={conf.id}
                        className={cn('rounded px-1.5 py-0.5 text-xs leading-tight', colorCls)}
                        title={`${conf.confirmRef} · ${conf.counterparty} · ${conf.amount.toLocaleString()}`}
                      >
                        <div className="font-medium truncate">{conf.instrument}</div>
                        <div className="font-mono truncate opacity-80">
                          {conf.direction} {conf.amount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Count badge */}
              {items.length > 0 && (
                <div className="text-center">
                  <span className="text-xs font-mono text-muted-foreground">{items.length} item{items.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Currency legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-xs text-muted-foreground">Currency key:</span>
        {Object.entries(CURRENCY_COLORS).map(([ccy, cls]) => (
          <span key={ccy} className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', cls)}>
            {ccy}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TradeOpsPage() {
  useEffect(() => { document.title = 'Trade Operations | CBS'; }, []);
  const { data: confirmations = [], isLoading: confsLoading, isError: confsError } = useTradeConfirmations();
  const { data: fails = [], isLoading: failsLoading, isError: failsError } = useSettlementFails();

  const pendingConfs = confirmations.filter((c) => c.status === 'PENDING').length;
  const unmatchedConfs = confirmations.filter((c) => c.matchStatus === 'UNMATCHED').length;
  const totalPenalties = useMemo(() => fails.reduce((sum, f) => sum + (f.penaltyAccrued ?? 0), 0), [fails]);

  return (
    <>
      <PageHeader title="Trade Operations" subtitle="Post-trade operations -- confirmations, settlement, fails management" />
      <div className="page-container space-y-4">
        {(confsError || failsError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            One or more trade-operations backend feeds failed to load. This page now shows the failure instead of masking it as an empty dataset.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Confirmations" value={pendingConfs} format="number" icon={FileCheck} />
          <StatCard label="Unmatched" value={unmatchedConfs} format="number" icon={AlertTriangle} />
          <StatCard label="Failed Settlements" value={fails.length} format="number" icon={XCircle} />
          <StatCard label="Total Penalties" value={totalPenalties} format="money" icon={DollarSign} />
        </div>

        <TabsPage syncWithUrl tabs={[
          {
            id: 'confirmations',
            label: 'Confirmations',
            badge: pendingConfs,
            content: <ConfirmationsTab confirmations={confirmations} isLoading={confsLoading} />,
          },
          {
            id: 'fails',
            label: 'Fails',
            badge: fails.length,
            content: <FailsTab fails={fails} isLoading={failsLoading} />,
          },
          {
            id: 'settlement-calendar',
            label: 'Settlement Calendar',
            content: <SettlementCalendarTab confirmations={confirmations} />,
          },
        ]} />
      </div>
    </>
  );
}
