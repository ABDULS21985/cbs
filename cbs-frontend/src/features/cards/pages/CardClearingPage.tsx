import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { FileCheck, ArrowLeftRight, Landmark, TrendingUp } from 'lucide-react';

const settlementData = [
  { network: 'VISA', outward: 890_000_000, inward: 1_200_000_000, interchange: 8_500_000, net: 301_500_000 },
  { network: 'Mastercard', outward: 456_000_000, inward: 678_000_000, interchange: 4_200_000, net: 217_800_000 },
  { network: 'Verve', outward: 345_000_000, inward: 412_000_000, interchange: 2_100_000, net: 64_900_000 },
];
const totals = settlementData.reduce((t, r) => ({ outward: t.outward + r.outward, inward: t.inward + r.inward, interchange: t.interchange + r.interchange, net: t.net + r.net }), { outward: 0, inward: 0, interchange: 0, net: 0 });

export function CardClearingPage() {
  return (
    <>
      <PageHeader title="Card Clearing & Settlement" subtitle="Clearing batches, settlement positions, interchange" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Batches Processed" value={12} format="number" icon={FileCheck} />
          <StatCard label="Total Transactions" value={45678} format="number" icon={ArrowLeftRight} />
          <StatCard label="Gross Value" value={totals.inward + totals.outward} format="money" compact icon={Landmark} />
          <StatCard label="Interchange Earned" value={totals.interchange} format="money" compact icon={TrendingUp} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'position', label: 'Settlement Position', content: (
            <div className="p-4">
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
