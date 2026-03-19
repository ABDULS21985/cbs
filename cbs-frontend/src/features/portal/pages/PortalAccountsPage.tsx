import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { portalApi, type PortalAccount } from '../api/portalApi';

export function PortalAccountsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  // Auto-select first account
  const effectiveId = selectedAccountId ?? accounts[0]?.id;
  const selectedAccount = accounts.find((a) => a.id === effectiveId);

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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Accounts</h1>

      {accountsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((acct) => (
            <button key={acct.id} onClick={() => setSelectedAccountId(acct.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${effectiveId === acct.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <p className="text-sm font-medium">{acct.accountName}</p>
              <p className="text-lg font-bold font-mono mt-1">{formatMoney(acct.availableBalance, acct.currency)}</p>
              <p className="text-xs text-muted-foreground font-mono">{acct.accountNumber}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
        <span className="text-sm text-muted-foreground">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
        <button onClick={() => handleDownload('PDF')} disabled={!dateFrom || !dateTo} className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"><Download className="w-3.5 h-3.5" /> PDF</button>
        <button onClick={() => handleDownload('CSV')} disabled={!dateFrom || !dateTo} className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50"><Download className="w-3.5 h-3.5" /> CSV</button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {txnsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Balance</th>
            </tr></thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 text-sm">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3 text-sm">{tx.description}</td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${tx.type === 'CREDIT' ? 'text-green-600' : ''}`}>{tx.type === 'CREDIT' ? '+' : '-'}{formatMoney(tx.amount, 'NGN')}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatMoney(tx.balance, 'NGN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
