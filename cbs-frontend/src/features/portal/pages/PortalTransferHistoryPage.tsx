import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  Loader2,
  Search,
  Send,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate, formatMoney, formatRelative } from '@/lib/formatters';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi, type PortalTransaction } from '../api/portalApi';

export function PortalTransferHistoryPage() {
  useEffect(() => {
    document.title = 'Transfer History | BellBank';
  }, []);

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 20;

  const { data: transactions = [], isLoading, isFetching } = useQuery({
    queryKey: ['portal', 'transfer-history', page],
    queryFn: () => portalApi.getRecentTransfers(page, pageSize),
    staleTime: 30_000,
  });

  const filtered = searchTerm
    ? transactions.filter((transaction: PortalTransaction) =>
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : transactions;

  const creditCount = filtered.filter((transaction) => transaction.type === 'CREDIT').length;
  const debitCount = filtered.filter((transaction) => transaction.type === 'DEBIT').length;

  const handleExportCsv = () => {
    const csv = [
      ['Date', 'Description', 'Type', 'Amount', 'Reference'].join(','),
      ...filtered.map((transaction: PortalTransaction) =>
        [transaction.date, `"${transaction.description}"`, transaction.type, transaction.amount, transaction.reference ?? ''].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transfer-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={ArrowLeftRight}
        eyebrow="Portal Transfers"
        title="Transfer History"
        description="Search, export, and review your latest transfer movements with a cleaner transaction ledger."
        chips={[
          searchTerm ? `Filter "${searchTerm}"` : 'All recent transfers',
          isFetching ? 'Refreshing feed' : 'Live transaction history',
        ]}
        metrics={[
          { label: 'Visible transfers', value: String(filtered.length) },
          { label: 'Credits', value: String(creditCount), tone: 'positive' },
          { label: 'Debits', value: String(debitCount), tone: debitCount > 0 ? 'warning' : 'default' },
        ]}
        actions={
          <Link
            to="/portal/transfer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            New Transfer
          </Link>
        }
      />

      <section className="portal-panel p-5 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by description or reference"
              className="portal-inline-input pl-10"
            />
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="portal-empty-state">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {searchTerm ? 'No transfers match your search' : 'No recent transfers'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? 'Try a different description or reference.' : 'Your transfer history will appear here after the first transaction.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-[1.35rem] border border-border/70">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/20">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reference</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((transaction: PortalTransaction) => {
                    const isCredit = transaction.type === 'CREDIT';

                    return (
                      <tr key={transaction.id} className="bg-card/35 transition-colors hover:bg-muted/10">
                        <td className="px-5 py-4 text-sm text-foreground">
                          <div className="space-y-1">
                            <p>{formatDate(transaction.date)}</p>
                            <p className="text-xs text-muted-foreground">{formatRelative(transaction.date)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full',
                                isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600',
                              )}
                            >
                              {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <span className="text-sm text-foreground">{transaction.description}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-muted-foreground">
                          <span className="font-mono">{transaction.reference || '-'}</span>
                        </td>
                        <td
                          className={cn(
                            'px-5 py-4 text-right text-sm font-semibold',
                            isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
                          )}
                        >
                          {isCredit ? '+' : '-'}
                          {formatMoney(transaction.amount, 'NGN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {filtered.length} transfers {isFetching ? '(updating...)' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                  className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={transactions.length < pageSize}
                  className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
