import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Download, Landmark, Loader2, Wallet } from 'lucide-react';

import { formatDate, formatMoney } from '@/lib/formatters';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi } from '../api/portalApi';

export function PortalAccountsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  const effectiveId = selectedAccountId ?? accounts[0]?.id;
  const selectedAccount = accounts.find((account) => account.id === effectiveId) ?? null;
  const totalAvailableBalance = accounts.reduce((sum, account) => sum + account.availableBalance, 0);

  const { data: transactions = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['portal', 'transactions', effectiveId, dateFrom, dateTo],
    queryFn: () => portalApi.getTransactions(effectiveId!, { from: dateFrom || undefined, to: dateTo || undefined }),
    enabled: !!effectiveId,
  });

  const handleDownload = (format: 'PDF' | 'CSV') => {
    if (effectiveId && dateFrom && dateTo) {
      portalApi.downloadStatement(effectiveId, dateFrom, dateTo, format);
    }
  };

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={Landmark}
        eyebrow="Portal Banking"
        title="My Accounts"
        description="Track balances, review recent movements, and export statements from the same workspace."
        chips={[
          selectedAccount ? `Active account ${selectedAccount.accountNumber}` : 'Choose an account',
          transactions.length > 0 ? `${transactions.length} transactions loaded` : 'Ready for statement export',
        ]}
        metrics={[
          { label: 'Accounts', value: String(accounts.length || 0) },
          { label: 'Available balance', value: formatMoney(totalAvailableBalance || 0, selectedAccount?.currency || 'NGN') },
          { label: 'Current account', value: selectedAccount?.accountType || 'Pending' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
        <section className="portal-panel p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Switch between your deposit accounts and keep the current balance in view.
              </p>
            </div>
            <span className="portal-page-hero-chip">{accounts.length} linked</span>
          </div>

          {accountsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const isActive = effectiveId === account.id;

                return (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${
                      isActive
                        ? 'border-primary/30 bg-primary/5 shadow-sm'
                        : 'border-border/70 bg-background/60 hover:border-primary/20 hover:bg-background/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{account.accountName}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {account.accountType}
                        </p>
                      </div>
                      <span className="portal-page-hero-chip">{account.status}</span>
                    </div>

                    <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                      {formatMoney(account.availableBalance, account.currency)}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{account.accountNumber}</span>
                      <span>Book {formatMoney(account.balance, account.currency)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-[1.35rem] border border-border/70 bg-background/60 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              Statement Window
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="portal-inline-input"
                  aria-label="Statement from date"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="portal-inline-input"
                  aria-label="Statement to date"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDownload('PDF')}
                disabled={!dateFrom || !dateTo}
                className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={() => handleDownload('CSV')}
                disabled={!dateFrom || !dateTo}
                className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
            </div>
          </div>
        </section>

        <section className="portal-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedAccount
                  ? `Latest entries on ${selectedAccount.accountName}`
                  : 'Select an account to review transactions'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Live feed
            </span>
          </div>

          {txnsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="portal-empty-state m-5">
              <ArrowUpDown className="h-10 w-10 text-muted-foreground/45" />
              <div>
                <p className="text-sm font-medium text-foreground">No transactions found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another date range or switch to a different account.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/20">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="bg-card/40 transition-colors hover:bg-muted/10">
                      <td className="px-5 py-4 text-sm text-foreground">{formatDate(transaction.date)}</td>
                      <td className="px-5 py-4 text-sm text-foreground">{transaction.description}</td>
                      <td
                        className={`px-5 py-4 text-right text-sm font-medium ${
                          transaction.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? '+' : '-'}
                        {formatMoney(transaction.amount, selectedAccount?.currency || 'NGN')}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-foreground">
                        {formatMoney(transaction.balance, selectedAccount?.currency || 'NGN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
