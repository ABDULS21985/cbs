import { formatMoney } from '@/lib/formatters';
import type { SensitivityRow } from '../../api/marketRiskApi';

interface Props { data: SensitivityRow[]; currency: string }

export function SensitivityTable({ data, currency }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Sensitivity Analysis</h3>
      <table className="w-full">
        <thead><tr className="border-b bg-muted/30"><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Risk Factor Shift</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">P&L Impact</th></tr></thead>
        <tbody className="divide-y">
          {data.map((row, i) => (
            <tr key={i}><td className="px-4 py-2 text-sm">{row.riskFactorShift}</td><td className={`px-4 py-2 text-sm text-right font-mono ${row.pnlImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>{row.pnlImpact >= 0 ? '+' : ''}{formatMoney(row.pnlImpact, currency)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
