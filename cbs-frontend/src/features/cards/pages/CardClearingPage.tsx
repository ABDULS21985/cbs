import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { FileCheck, ArrowLeftRight, Landmark, TrendingUp } from 'lucide-react';
import { cardClearingApi } from '../api/cardClearingApi';

const NETWORKS = ['VISA', 'Mastercard', 'Verve'] as const;

function useSettlementPositions() {
  const today = new Date().toISOString().slice(0, 10);

  const queries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions', today, network],
      queryFn: () =>
        cardClearingApi.positions(today, network).catch(() => []),
    }),
  );

  const isLoading = queries.some((q) => q.isLoading);

  const settlementData = NETWORKS.map((network, i) => {
    const positions = queries[i].data ?? [];
    const outward = positions.reduce((s, p) => s + (p.grossDebits ?? 0), 0);
    const inward = positions.reduce((s, p) => s + (p.grossCredits ?? 0), 0);
    const interchange = positions.reduce((s, p) => s + (p.interchangeReceivable ?? 0), 0);
    const net = positions.reduce((s, p) => s + (p.netPosition ?? 0), 0);
    return { network, outward, inward, interchange, net };
  });

  const totals = settlementData.reduce(
    (t, r) => ({
      outward: t.outward + r.outward,
      inward: t.inward + r.inward,
      interchange: t.interchange + r.interchange,
      net: t.net + r.net,
    }),
    { outward: 0, inward: 0, interchange: 0, net: 0 },
  );

  const totalTransactions = NETWORKS.reduce((sum, _network, i) => {
    const positions = queries[i].data ?? [];
    return sum + positions.length;
  }, 0);

  return { settlementData, totals, totalTransactions, isLoading };
}

export function CardClearingPage() {
  const { settlementData, totals, totalTransactions, isLoading } = useSettlementPositions();

  return (
    <>
      <PageHeader title="Card Clearing & Settlement" subtitle="Clearing batches, settlement positions, interchange" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Networks" value={NETWORKS.length} format="number" icon={FileCheck} loading={isLoading} />
          <StatCard label="Settlement Entries" value={totalTransactions} format="number" icon={ArrowLeftRight} loading={isLoading} />
          <StatCard label="Gross Value" value={totals.inward + totals.outward} format="money" compact icon={Landmark} loading={isLoading} />
          <StatCard label="Interchange Earned" value={totals.interchange} format="money" compact icon={TrendingUp} loading={isLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'position', label: 'Settlement Position', content: (
            <div className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full data-table">
                    <thead><tr className="bg-muted/30 border-b">
                      <th className="px-4 py-2.5 text-left">Network</th>
                      <th className="px-4 py-2.5 text-right">Outward</th>
                      <th className="px-4 py-2.5 text-right">Inward</th>
                      <th className="px-4 py-2.5 text-right">Interchange</th>
                      <th className="px-4 py-2.5 text-right">Net</th>
                    </tr></thead>
                    <tbody>
                      {settlementData.map((r) => (
                        <tr key={r.network}>
                          <td className="px-4 text-sm font-medium">{r.network}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(r.outward)}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(r.inward)}</td>
                          <td className="px-4 text-sm font-mono text-right text-green-600">{formatMoney(r.interchange)}</td>
                          <td className="px-4 text-sm font-mono text-right font-semibold">{formatMoney(r.net)}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-4 py-2 text-sm">TOTAL</td>
                        <td className="px-4 py-2 text-sm font-mono text-right">{formatMoney(totals.outward)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right">{formatMoney(totals.inward)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-green-600">{formatMoney(totals.interchange)}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-primary">{formatMoney(totals.net)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )},
          { id: 'batches', label: 'Clearing Batches', content: <div className="p-8 text-center text-muted-foreground">Clearing batch details coming soon</div> },
          { id: 'interchange', label: 'Interchange', content: <div className="p-8 text-center text-muted-foreground">Interchange analysis coming soon</div> },
          { id: 'reconciliation', label: 'Reconciliation', content: <div className="p-8 text-center text-muted-foreground">Network reconciliation coming soon</div> },
        ]} />
      </div>
    </>
  );
}
