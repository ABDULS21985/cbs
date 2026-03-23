import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { getFeeDefinitions, type FeeDefinition, type FeeCalcType } from '../api/feeApi';

const BUCKETS = [
  { label: '₦1K - ₦10K', min: 1000, max: 10000, avg: 5500 },
  { label: '₦10K - ₦50K', min: 10000, max: 50000, avg: 30000 },
  { label: '₦50K - ₦100K', min: 50000, max: 100000, avg: 75000 },
  { label: '₦100K - ₦500K', min: 100000, max: 500000, avg: 300000 },
  { label: '₦500K+', min: 500000, max: 2000000, avg: 1000000 },
];

function calculateFee(calcType: FeeCalcType, amount: number, flat?: number, pct?: number, min?: number, max?: number): number {
  let fee = 0;
  if (calcType === 'FLAT') fee = flat ?? 0;
  else if (calcType === 'PERCENTAGE') fee = amount * ((pct ?? 0) / 100);
  else fee = flat ?? 0;

  if (min != null && fee < min) fee = min;
  if (max != null && fee > max) fee = max;
  return fee;
}

export function FeeImpactSimulator() {
  const { data: fees = [] } = useQuery({
    queryKey: ['fee-definitions'],
    queryFn: getFeeDefinitions,
  });

  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [proposedType, setProposedType] = useState<FeeCalcType>('FLAT');
  const [proposedFlat, setProposedFlat] = useState(0);
  const [proposedPct, setProposedPct] = useState(0);
  const [proposedMin, setProposedMin] = useState<number | undefined>();
  const [proposedMax, setProposedMax] = useState<number | undefined>();
  const [monthlyTxns, setMonthlyTxns] = useState(1000);

  const selectedFee = fees.find((f) => f.id === selectedFeeId);

  const impact = useMemo(() => {
    if (!selectedFee) return [];
    return BUCKETS.map((bucket) => {
      const current = calculateFee(selectedFee.calcType, bucket.avg, selectedFee.flatAmount, selectedFee.percentage, selectedFee.minFee, selectedFee.maxFee);
      const proposed = calculateFee(proposedType, bucket.avg, proposedFlat, proposedPct, proposedMin, proposedMax);
      return { ...bucket, current, proposed, diff: proposed - current };
    });
  }, [selectedFee, proposedType, proposedFlat, proposedPct, proposedMin, proposedMax]);

  const netImpact = useMemo(() => {
    if (impact.length === 0) return 0;
    const perBucket = Math.floor(monthlyTxns / BUCKETS.length);
    return impact.reduce((s, b) => s + b.diff * perBucket, 0);
  }, [impact, monthlyTxns]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Fee Impact Simulator</h3>
        <p className="text-xs text-muted-foreground">Compare current vs proposed fee structure</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Fee selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Select Fee Definition</label>
            <select value={selectedFeeId} onChange={(e) => {
              setSelectedFeeId(e.target.value);
              const f = fees.find((x) => x.id === e.target.value);
              if (f) {
                setProposedType(f.calcType);
                setProposedFlat(f.flatAmount ?? 0);
                setProposedPct(f.percentage ?? 0);
                setProposedMin(f.minFee);
                setProposedMax(f.maxFee);
              }
            }}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select a fee…</option>
              {fees.filter((f) => f.status === 'ACTIVE').map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Monthly Transactions (estimate)</label>
            <input type="number" value={monthlyTxns} onChange={(e) => setMonthlyTxns(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {selectedFee && (
          <>
            {/* Current vs Proposed */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current</p>
                <p className="text-sm font-semibold">
                  {selectedFee.calcType === 'FLAT' ? formatMoney(selectedFee.flatAmount ?? 0) + ' flat' :
                   selectedFee.calcType === 'PERCENTAGE' ? `${selectedFee.percentage}% of transaction` :
                   `${selectedFee.calcType} structure`}
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Proposed</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={proposedType} onChange={(e) => setProposedType(e.target.value as FeeCalcType)}
                    className="px-2 py-1 text-xs rounded border bg-background">
                    <option value="FLAT">Flat</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                  {proposedType === 'FLAT' ? (
                    <input type="number" value={proposedFlat} onChange={(e) => setProposedFlat(Number(e.target.value))}
                      placeholder="Amount" className="px-2 py-1 text-xs rounded border bg-background" />
                  ) : (
                    <input type="number" step="0.01" value={proposedPct} onChange={(e) => setProposedPct(Number(e.target.value))}
                      placeholder="Rate %" className="px-2 py-1 text-xs rounded border bg-background" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={proposedMin ?? ''} onChange={(e) => setProposedMin(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Min fee" className="px-2 py-1 text-xs rounded border bg-background" />
                  <input type="number" value={proposedMax ?? ''} onChange={(e) => setProposedMax(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Max fee" className="px-2 py-1 text-xs rounded border bg-background" />
                </div>
              </div>
            </div>

            {/* Impact table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Txn Range</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Current</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Proposed</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {impact.map((row) => (
                    <tr key={row.label} className="hover:bg-muted/20">
                      <td className="px-4 py-2 text-sm">{row.label}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(row.current)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatMoney(row.proposed)}</td>
                      <td className={cn('px-4 py-2 text-right font-mono text-xs font-medium flex items-center justify-end gap-1',
                        row.diff > 0 ? 'text-green-600' : row.diff < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                        {row.diff > 0 ? <TrendingUp className="w-3 h-3" /> : row.diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {row.diff >= 0 ? '+' : ''}{formatMoney(row.diff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Net Impact */}
            <div className={cn('rounded-lg border p-4 text-center',
              netImpact > 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200' :
              netImpact < 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200' :
              'bg-muted/20')}>
              <p className="text-xs text-muted-foreground">Estimated Net Revenue Impact (monthly)</p>
              <p className={cn('text-xl font-bold mt-1',
                netImpact > 0 ? 'text-green-600' : netImpact < 0 ? 'text-red-600' : '')}>
                {netImpact >= 0 ? '+' : ''}{formatMoney(netImpact)}/month
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Based on {monthlyTxns.toLocaleString()} transactions evenly distributed</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
