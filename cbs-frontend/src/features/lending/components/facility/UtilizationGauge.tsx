import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';

interface UtilizationGaugeProps {
  utilized: number;
  limit: number;
  currency?: string;
}

export function UtilizationGauge({ utilized, limit, currency = 'NGN' }: UtilizationGaugeProps) {
  const available = Math.max(0, limit - utilized);
  const pct = limit > 0 ? Math.min((utilized / limit) * 100, 100) : 0;

  const data = [
    { name: 'Utilized', value: utilized },
    { name: 'Available', value: available },
  ];

  const gaugeColor = pct < 70 ? '#3b82f6' : pct < 90 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <PieChart width={200} height={200}>
          <Pie
            data={data}
            cx={100}
            cy={100}
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={gaugeColor} />
            <Cell fill="#e5e7eb" />
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatMoneyCompact(value, currency), '']}
          />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{pct.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">Utilized</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm w-full px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: gaugeColor }} />
            <span className="text-muted-foreground">Used</span>
          </div>
          <span className="font-medium" style={{ color: gaugeColor }}>
            {formatMoneyCompact(utilized, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <span className="font-medium text-green-600">
            {formatMoneyCompact(available, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
