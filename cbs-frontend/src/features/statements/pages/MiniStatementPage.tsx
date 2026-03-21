import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Search, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MiniStatementTransaction {
  id: number;
  transactionRef: string;
  postingDate: string;
  narration: string;
  transactionType: string;
  amount: number;
  runningBalance: number;
  currencyCode: string;
}

interface AccountOption {
  id: string;
  accountNumber: string;
  label: string;
  customerId: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  accountId: z.string().min(1, 'Select an account'),
  count: z.coerce.number().min(5).max(50).default(10),
});

type FormValues = z.infer<typeof schema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MiniStatementPage() {
  const [searchParams, setSearchParams] = useState<{
    customerId: string;
    accountNumber: string;
    count: number;
  } | null>(null);

  // ── Accounts ────────────────────────────────────────────────────
  const { data: accounts = [] } = useQuery({
    queryKey: ['mini-stmt-accounts'],
    queryFn: async () => {
      const result = await apiGet<{
        content: Array<{
          id: number;
          accountNumber: string;
          accountName: string;
          currencyCode: string;
          customerId: number;
        }>;
      }>('/v1/accounts', { page: 0, size: 100 });
      const list = Array.isArray(result) ? result : (result?.content ?? []);
      return list.map(
        (a: {
          id: number;
          accountNumber: string;
          accountName: string;
          currencyCode: string;
          customerId: number;
        }) => ({
          id: String(a.id),
          accountNumber: a.accountNumber,
          label: `${a.accountNumber} — ${a.accountName} (${a.currencyCode})`,
          customerId: String(a.customerId ?? 1),
        }),
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Form ────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accountId: '', count: 10 },
  });

  const onSubmit = (values: FormValues) => {
    const acc = accounts.find((a: AccountOption) => a.id === values.accountId);
    if (!acc) return;
    setSearchParams({
      customerId: acc.customerId,
      accountNumber: acc.accountNumber,
      count: values.count,
    });
  };

  // ── Mini statement fetch ────────────────────────────────────────
  const {
    data: transactions = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['mini-statement', searchParams],
    queryFn: () =>
      apiGet<MiniStatementTransaction[]>(
        `/v1/portal/${searchParams!.customerId}/accounts/${searchParams!.accountNumber}/mini-statement`,
        { page: 0, size: searchParams!.count },
      ),
    enabled: !!searchParams,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  function isDebit(type: string): boolean {
    return type.includes('DEBIT') || type.includes('FEE') || type.includes('TRANSFER_OUT') || type.includes('LIEN');
  }

  return (
    <>
      <PageHeader
        title="Mini Statement"
        subtitle="Quick view of recent transactions on any account."
      />

      <div className="page-container space-y-6">
        {/* ── Search Form ─────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-card"
        >
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
            {errors.accountId && (
              <p className="text-xs text-destructive">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-1 w-32">
            <label className="text-sm font-medium">Transactions</label>
            <select
              {...register('count')}
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  Last {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Load
          </button>
        </form>

        {/* ── Results ──────────────────────────────────────────── */}
        {!searchParams && !isLoading && (
          <div className="rounded-lg border bg-card min-h-[250px] flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="Select an account"
              description="Pick an account above to see its most recent transactions."
            />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive">Failed to load mini statement.</p>
          </div>
        )}

        {searchParams && !isLoading && !isError && (
          <div className="rounded-lg border bg-card overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-right px-4 py-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id ?? tx.transactionRef}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(tx.postingDate)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{tx.transactionRef}</td>
                      <td className="px-4 py-2.5 max-w-[260px] truncate">{tx.narration}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isDebit(tx.transactionType)
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {tx.transactionType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono ${
                          isDebit(tx.transactionType) ? 'text-red-600' : 'text-green-700'
                        }`}
                      >
                        {isDebit(tx.transactionType) ? '-' : '+'}
                        {formatMoney(tx.amount, tx.currencyCode)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        {formatMoney(tx.runningBalance, tx.currencyCode)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {transactions.length > 0 && (
              <div className="px-4 py-3 border-t text-xs text-muted-foreground text-right">
                Showing {transactions.length} recent transaction(s)
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
