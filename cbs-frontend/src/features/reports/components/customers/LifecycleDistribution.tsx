import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LifecycleSegment } from '../../api/customerAnalyticsApi';

interface LifecycleDistributionProps {
  data: LifecycleSegment[];
  isLoading: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: LifecycleSegment = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.stage}</p>
      <p className="text-muted-foreground">
        Count: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.percentage.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percentage < 5) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${percentage.toFixed(0)}%`}
    </text>
  );
}

function DonutCenter({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize={20}
        fontWeight={700}
      >
        {total >= 1000 ? `${(total / 1000).toFixed(0)}K` : total.toLocaleString()}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
      >
        Total Customers
      </text>
    </g>
  );
}

export function LifecycleDistribution({ data, isLoading }: LifecycleDistributionProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (isLoading) {
    return (
      <div className="surface-card p-4 flex items-center justify-center h-80">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="surface-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Customer Lifecycle Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="44%"
            innerRadius={68}
            outerRadius={106}
            paddingAngle={2}
            dataKey="count"
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          {total > 0 && (
            <Pie
              data={[{ value: 1 }]}
              cx="50%"
              cy="44%"
              innerRadius={0}
              outerRadius={0}
              dataKey="value"
              label={(props) => <DonutCenter cx={props.cx} cy={props.cy} total={total} />}
              labelLine={false}
              fill="none"
              stroke="none"
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
            payload={data.map((d) => ({
              value: `${d.stage} (${d.count.toLocaleString()})`,
              type: 'square' as const,
              color: d.color,
            }))}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
