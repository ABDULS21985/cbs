import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Download,
  Mail,
  Search,
  Loader2,
  CalendarDays,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { formatDate, formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import { statementApi } from '../api/statementApi';
import type { StatementData, StatementFormat } from '../api/statementApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountOption {
  id: string;
  label: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const filterSchema = z.object({
  accountId: z.string().min(1, 'Select an account'),
  dateRange: z.object({
    from: z.date({ required_error: 'Start date required' }),
    to: z.date({ required_error: 'End date required' }),
  }),
});

type FilterValues = z.infer<typeof filterSchema>;

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastData {
  message: string;
  type: 'success' | 'error';
}

function Toast({ message, type }: ToastData) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StatementHistoryPage() {
  const [searchParams, setSearchParams] = useState<{
    accountId: string;
    from: string;
    to: string;
  } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Accounts ────────────────────────────────────────────────────
  const { data: accounts = [] } = useQuery({
    queryKey: ['statement-history-accounts'],
    queryFn: async () => {
      const result = await apiGet<{
        content: Array<{ id: number; accountNumber: string; accountName: string; currencyCode: string }>;
      }>('/v1/accounts', { page: 0, size: 100 });
      const list = Array.isArray(result) ? result : (result?.content ?? []);
      return list.map(
        (a: { id: number; accountNumber: string; accountName: string; currencyCode: string }) => ({
          id: String(a.id),
          label: `${a.accountNumber} — ${a.accountName} (${a.currencyCode})`,
        }),
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Form ────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      accountId: '',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
        to: new Date(),
      },
    },
  });

  const onFilter = (values: FilterValues) => {
    setSearchParams({
      accountId: values.accountId,
      from: values.dateRange.from.toISOString().slice(0, 10),
      to: values.dateRange.to.toISOString().slice(0, 10),
    });
  };

  // ── Statement fetch ─────────────────────────────────────────────
  const {
    data: statementData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['statement-history', searchParams],
    queryFn: () =>
      statementApi.getStatementData(searchParams!.accountId, searchParams!.from, searchParams!.to),
    enabled: !!searchParams,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // ── Download ────────────────────────────────────────────────────
  const downloadMutation = useMutation({
    mutationFn: ({ format }: { format: StatementFormat }) => {
      if (!searchParams) throw new Error('No search params');
      return statementApi.downloadStatement(searchParams.accountId, searchParams.from, searchParams.to, format);
    },
    onSuccess: (_d, { format }) => {
      if (format === 'PDF') window.print();
      showToast(`${format} statement ready`);
    },
    onError: () => showToast('Download failed', 'error'),
  });

  // ── Email ───────────────────────────────────────────────────────
  const emailMutation = useMutation({
    mutationFn: (email: string) => {
      if (!searchParams) throw new Error('No search params');
      return statementApi.emailStatement(searchParams.accountId, searchParams.from, searchParams.to, email);
    },
    onSuccess: (data) => showToast(data.message || 'Statement emailed successfully'),
    onError: () => showToast('Email send failed', 'error'),
  });

  // ── Derived ─────────────────────────────────────────────────────
  const transactions = useMemo(() => statementData?.transactions ?? [], [statementData]);

  return (
    <>
      <PageHeader
        title="Statement History"
        subtitle="View and download account statements for any period."
      />

      <div className="page-container space-y-6">
        {/* ── Filter Bar ─────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit(onFilter)}
          className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-card"
        >
          {/* Account */}
          <div className="space-y-1 min-w-[240px] flex-1">
            <label className="text-sm font-medium">Account</label>
            <select
              {...register('accountId')}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select account...</option>
              {accounts.map((a: AccountOption) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
          </div>

          {/* Date Range */}
          <div className="space-y-1 min-w-[260px]">
            <label className="text-sm font-medium">Period</label>
            <Controller
              name="dateRange"
              control={control}
              render={({ field }) => (
                <DateRangePicker
                  value={field.value as { from?: Date; to?: Date }}
                  onChange={(range: { from?: Date; to?: Date }) => {
                    if (range.from && range.to) {
                      field.onChange({ from: range.from, to: range.to });
                    }
                  }}
                />
              )}
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Load Statement
          </button>
        </form>

        {/* ── Results ──────────────────────────────────────────── */}
        {!searchParams && !isLoading && (
          <div className="rounded-lg border bg-card min-h-[300px] flex items-center justify-center">
            <EmptyState
              icon={CalendarDays}
              title="Select an account and period"
              description="Choose an account and date range above to view the statement history."
            />
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 bg-muted/70 rounded" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive">Failed to load statement.</p>
            <p className="text-xs text-muted-foreground mt-1">Please check the account and date range, then try again.</p>
          </div>
        )}

        {statementData && !isLoading && (
          <>
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                onClick={() => downloadMutation.mutate({ format: 'PDF' })}
                disabled={downloadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {downloadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF
              </button>
              <button
                onClick={() => downloadMutation.mutate({ format: 'CSV' })}
                disabled={downloadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
              >
                CSV
              </button>
              <button
                onClick={() => downloadMutation.mutate({ format: 'EXCEL' })}
                disabled={downloadMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Excel
              </button>
              <button
                onClick={() => {
                  const email = window.prompt('Enter recipient email address:');
                  if (email) emailMutation.mutate(email);
                }}
                disabled={emailMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Opening Balance" value={formatMoney(statementData.openingBalance, statementData.currency)} />
              <SummaryCard label="Closing Balance" value={formatMoney(statementData.closingBalance, statementData.currency)} highlight />
              <SummaryCard label="Total Debits" value={formatMoney(statementData.totalDebits, statementData.currency)} className="text-red-600" />
              <SummaryCard label="Total Credits" value={formatMoney(statementData.totalCredits, statementData.currency)} className="text-green-700" />
            </div>

            {/* Transaction Table */}
            <div className="rounded-lg border bg-card overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Reference</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-right px-4 py-3 font-medium">Debit</th>
                    <th className="text-right px-4 py-3 font-medium">Credit</th>
                    <th className="text-right px-4 py-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                        No transactions for this period.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{tx.reference}</td>
                        <td className="px-4 py-2.5 max-w-[260px] truncate">{tx.description}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-red-600">
                          {tx.debit != null ? formatMoney(tx.debit, statementData.currency) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-green-700">
                          {tx.credit != null ? formatMoney(tx.credit, statementData.currency) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">
                          {formatMoney(tx.balance, statementData.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-muted-foreground text-right">
              {transactions.length} transaction(s) &middot; Generated {formatDate(statementData.generatedAt)}
            </div>
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${className ?? ''}`}>{value}</div>
    </div>
  );
}
