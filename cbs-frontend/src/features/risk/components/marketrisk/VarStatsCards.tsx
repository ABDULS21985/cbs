import { formatMoney } from '@/lib/formatters';
import type { VarStats } from '../../api/marketRiskApi';

interface Props { stats: VarStats }

export function VarStatsCards({ stats }: Props) {
  const c = stats.currency;
  const cards = [
    { label: 'Portfolio VaR (95%, 1d)', value: formatMoney(stats.portfolioVar95, c) },
    { label: 'ES (97.5%)', value: formatMoney(stats.expectedShortfall975, c) },
    { label: 'VaR Limit', value: formatMoney(stats.varLimit, c) },
    { label: 'Utilization', value: `${stats.utilizationPct.toFixed(0)}%`, ok: stats.utilizationPct < 80 },
    { label: 'Capital Charge', value: formatMoney(stats.capitalCharge, c) },
    { label: 'Stress Loss (worst)', value: formatMoney(stats.worstStressLoss, c) },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-label">{s.label}</div>
          <div className={`stat-value ${s.ok === false ? 'text-red-600' : s.ok === true ? 'text-green-600' : ''}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
