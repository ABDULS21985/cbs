import { useQueries } from '@tanstack/react-query';
import { formatDate, formatMoney } from '@/lib/formatters';
import { tradingBooksApi } from '../../api/tradingBookApi';
import type { TradingBook } from '../../api/tradingApi';
import type { TradingBookSnapshot } from '../../types/tradingBook';

interface BookRiskSummaryProps {
  books: TradingBook[];
}

export function BookRiskSummary({ books }: BookRiskSummaryProps) {
  const snapshotQueries = useQueries({
    queries: books.map((book) => ({
      queryKey: ['treasury', 'trading-book-snapshots', book.id],
      queryFn: () => tradingBooksApi.getBookHistory(Number(book.id)),
      staleTime: 30_000,
      enabled: Number(book.id) > 0,
    })),
  });

  const rows = books.map((book, index) => {
    const snapshots = (snapshotQueries[index]?.data ?? [])
      .slice()
      .sort(
        (left: TradingBookSnapshot, right: TradingBookSnapshot) =>
          new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime(),
      );
    const latest = snapshots[0];
    return {
      book,
      latest,
      deltaPnl:
        latest && typeof latest.totalPnl === 'number' ? book.capitalRequirement - latest.capitalCharge : null,
    };
  });

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">Trading Book Risk Summary</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Current capital usage against the latest recorded book snapshots.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3 py-2">Book</th>
              <th className="px-3 py-2">Capital Req.</th>
              <th className="px-3 py-2">Allocated</th>
              <th className="px-3 py-2">Utilization</th>
              <th className="px-3 py-2">Latest Snapshot</th>
              <th className="px-3 py-2">Snapshot P&L</th>
              <th className="px-3 py-2">Current vs Snapshot</th>
              <th className="px-3 py-2">VaR 95%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ book, latest, deltaPnl }) => (
              <tr key={book.id} className="border-b last:border-b-0">
                <td className="px-3 py-3">
                  <p className="font-medium">{book.bookName}</p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">{book.bookCode}</p>
                </td>
                <td className="px-3 py-3 font-mono">{formatMoney(book.capitalRequirement)}</td>
                <td className="px-3 py-3 font-mono">{formatMoney(book.capitalAllocated)}</td>
                <td className="px-3 py-3">
                  <span className="font-mono">{book.utilizationPct.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-3">
                  {latest ? (
                    <div>
                      <p>{formatDate(latest.snapshotDate)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{latest.snapshotType}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No snapshot yet</span>
                  )}
                </td>
                <td className="px-3 py-3 font-mono">
                  {latest ? formatMoney(latest.totalPnl) : '—'}
                </td>
                <td className="px-3 py-3">
                  {deltaPnl == null ? (
                    <span className="text-xs text-muted-foreground">Awaiting baseline</span>
                  ) : (
                    <span className={`font-mono ${deltaPnl >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatMoney(deltaPnl)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 font-mono">
                  {latest ? formatMoney(latest.var951d) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
