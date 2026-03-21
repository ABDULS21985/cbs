import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft, Loader2, Send, Search, Download } from 'lucide-react';
import { formatMoney, formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { portalApi, type PortalTransaction } from '../api/portalApi';

export function PortalTransferHistoryPage() {
  useEffect(() => { document.title = 'Transfer History | BellBank'; }, []);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 20;

  const { data: transactions = [], isLoading, isFetching } = useQuery({
    queryKey: ['portal', 'transfer-history', page],
    queryFn: () => portalApi.getRecentTransfers(page, pageSize),
    staleTime: 30_000,
  });

  const filtered = searchTerm
    ? transactions.filter((tx: PortalTransaction) =>
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()))
    : transactions;

  const handleExportCsv = () => {
    const csv = [
      ['Date', 'Description', 'Type', 'Amount', 'Reference'].join(','),
      ...filtered.map((tx: PortalTransaction) =>
        [tx.date, `"${tx.description}"`, tx.type, tx.amount, tx.reference ?? ''].join(',')
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transfer History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View your recent transfer transactions</p>
        </div>
        <Link to="/portal/transfer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Send className="w-4 h-4" /> New Transfer
        </Link>
      </div>

      {/* Search and Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description or reference..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <button onClick={handleExportCsv} disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ArrowLeftRight className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'No transfers match your search' : 'No recent transfers'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((tx: PortalTransaction) => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <tr key={tx.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                            isCredit ? 'bg-green-50' : 'bg-red-50')}>
                            {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <span className="text-sm truncate">{tx.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{tx.reference || '-'}</td>
                      <td className={cn('px-4 py-3 text-sm text-right font-mono font-medium',
                        isCredit ? 'text-green-600' : 'text-foreground')}>
                        {isCredit ? '+' : '-'}{formatMoney(tx.amount, 'NGN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} transfers {isFetching && '(updating...)'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={transactions.length < pageSize}
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
