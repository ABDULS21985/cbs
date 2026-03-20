import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { FeeDefinition } from '../api/feeApi';

interface FeeComparisonPanelProps {
  fees: FeeDefinition[];
  onClose: () => void;
}

const SCHEDULE_LABELS: Record<string, string> = {
  PER_TRANSACTION: 'Per Txn',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
};

export function FeeComparisonPanel({ fees, onClose }: FeeComparisonPanelProps) {
  if (fees.length < 2) return null;

  const rows: { label: string; values: (string | React.ReactNode)[] }[] = [
    { label: 'Fee Code', values: fees.map((f) => <code className="text-xs font-mono">{f.code}</code>) },
    { label: 'Category', values: fees.map((f) => f.category.replace(/_/g, ' ')) },
    { label: 'Calc Type', values: fees.map((f) => f.calcType) },
    {
      label: 'Amount / Rate',
      values: fees.map((f) =>
        f.calcType === 'FLAT' ? formatMoney(f.flatAmount ?? 0) :
        f.calcType === 'PERCENTAGE' ? `${f.percentage ?? 0}%` :
        `${f.tiers?.length ?? 0} tiers`,
      ),
    },
    { label: 'Min Fee', values: fees.map((f) => f.minFee != null ? formatMoney(f.minFee) : '—') },
    { label: 'Max Fee', values: fees.map((f) => f.maxFee != null ? formatMoney(f.maxFee) : '—') },
    { label: 'VAT', values: fees.map((f) => f.vatApplicable ? `Yes (${f.vatRate ?? 7.5}%)` : 'No') },
    { label: 'Schedule', values: fees.map((f) => SCHEDULE_LABELS[f.schedule] ?? f.schedule) },
    { label: 'Waiver Auth', values: fees.map((f) => f.waiverAuthority) },
    { label: 'Products', values: fees.map((f) => f.applicableProducts.length > 0 ? f.applicableProducts.join(', ') : '—') },
    { label: 'Status', values: fees.map((f) => (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
        {f.status}
      </span>
    )) },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-3xl bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold">Fee Comparison ({fees.length} selected)</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-32">Attribute</th>
                  {fees.map((f) => (
                    <th key={f.id} className="text-left px-4 py-2.5 text-xs font-medium">{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.label} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-sm">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tiers comparison */}
          {fees.some((f) => f.tiers && f.tiers.length > 0) && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold">Tier Structures</h4>
              <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: `repeat(${fees.length}, 1fr)` }}>
                {fees.map((f) => (
                  <div key={f.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium mb-2">{f.name}</p>
                    {f.tiers && f.tiers.length > 0 ? (
                      <div className="space-y-1">
                        {f.tiers.map((t, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{formatMoney(t.fromAmount)} - {formatMoney(t.toAmount)}</span>
                            <span className="font-mono">{t.rate > 0 ? `${t.rate}%` : formatMoney(t.flatFee)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No tiers</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
