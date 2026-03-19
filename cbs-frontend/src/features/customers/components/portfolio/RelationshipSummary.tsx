import { formatMoney, formatMoneyCompact } from '@/lib/formatters';

interface Props {
  totalBalance: number;
  productsHeld: number;
  monthlyRevenue: number;
  lifetimeValue: number;
  currency?: string;
}

export function RelationshipSummary({ totalBalance, productsHeld, monthlyRevenue, lifetimeValue, currency = 'NGN' }: Props) {
  const stats = [
    { label: 'Total Balance', value: formatMoneyCompact(totalBalance, currency) },
    { label: 'Products Held', value: String(productsHeld) },
    { label: 'Monthly Revenue', value: formatMoney(monthlyRevenue, currency) },
    { label: 'Lifetime Value', value: formatMoneyCompact(lifetimeValue, currency) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card">
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
