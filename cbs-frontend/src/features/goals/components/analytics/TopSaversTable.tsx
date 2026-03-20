import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/lib/formatters';
import type { SavingsGoal } from '../../api/goalApi';

interface Props {
  goals: SavingsGoal[];
}

interface SaverRow {
  customerId: string;
  goals: number;
  totalSaved: number;
  savingsRate: number;
  completionRate: number;
}

export function TopSaversTable({ goals }: Props) {
  const navigate = useNavigate();

  // Aggregate by source account (proxy for customer)
  const byCustomer: Record<string, { goals: SavingsGoal[] }> = {};
  goals.forEach((g) => {
    const key = g.sourceAccountId || 'unknown';
    if (!byCustomer[key]) byCustomer[key] = { goals: [] };
    byCustomer[key].goals.push(g);
  });

  const rows: SaverRow[] = Object.entries(byCustomer).map(([id, { goals: custGoals }]) => {
    const totalSaved = custGoals.reduce((s, g) => s + g.currentAmount, 0);
    const totalTarget = custGoals.reduce((s, g) => s + g.targetAmount, 0);
    const completed = custGoals.filter((g) => g.status === 'COMPLETED').length;
    return {
      customerId: id,
      goals: custGoals.length,
      totalSaved,
      savingsRate: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
      completionRate: custGoals.length > 0 ? (completed / custGoals.length) * 100 : 0,
    };
  }).sort((a, b) => b.totalSaved - a.totalSaved).slice(0, 20);

  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No savings data</p>;

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Account</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Goals</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total Saved</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Progress</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Completion</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={r.customerId} className="hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/accounts/${r.customerId}`)}>
              <td className="px-4 py-2.5 text-sm font-bold text-muted-foreground">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{r.customerId}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.goals}</td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">{formatMoney(r.totalSaved)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.savingsRate.toFixed(0)}%</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{r.completionRate.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
