import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { ProductPenetration } from '../../api/customerAnalyticsApi';

interface ProductPenetrationBarProps {
  data: ProductPenetration[];
  isLoading: boolean;
}

function barColor(pct: number): string {
  if (pct > 60) return '#22c55e';
  if (pct >= 30) return '#f59e0b';
  return '#ef4444';
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ProductPenetration;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Penetration: <span className="text-foreground font-medium">{d.penetrationPct.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        Customers: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
    </div>
  );
}

export function ProductPenetrationBar({ data, isLoading }: ProductPenetrationBarProps) {
  if (isLoading) {
    return (
      <div className="surface-card p-4 h-72 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.penetrationPct - a.penetrationPct);

  return (
    <div className="surface-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Product Penetration Rate</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="product"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="penetrationPct" radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList
              dataKey="penetrationPct"
              position="right"
              formatter={(value: number) => `${value.toFixed(1)}%`}
              style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
            />
            {sorted.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.penetrationPct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 flex-wrap pt-1">
        {[
          { label: 'High (>60%)', color: '#22c55e' },
          { label: 'Medium (30–60%)', color: '#f59e0b' },
          { label: 'Low (<30%)', color: '#ef4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
