import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaterfallItem {
  category: string;
  amount: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

interface PnlWaterfallChartProps {
  data: WaterfallItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ComputedBar {
  category: string;
  amount: number;
  start: number;
  end: number;
  isTotal: boolean;
  isSubtotal: boolean;
  isPositive: boolean;
  totalRevenue: number;
}

function computeWaterfall(items: WaterfallItem[]): ComputedBar[] {
  const totalRevenue = items.find((i) => i.isTotal || i.category.toLowerCase().includes('revenue'))?.amount || items[0]?.amount || 1;
  let running = 0;
  return items.map((item) => {
    if (item.isTotal || item.isSubtotal) {
      const bar: ComputedBar = {
        category: item.category,
        amount: item.amount,
        start: 0,
        end: item.amount,
        isTotal: !!item.isTotal,
        isSubtotal: !!item.isSubtotal,
        isPositive: item.amount >= 0,
        totalRevenue,
      };
      running = item.amount;
      return bar;
    }
    const start = running;
    running += item.amount;
    return {
      category: item.category,
      amount: item.amount,
      start: Math.min(start, running),
      end: Math.max(start, running),
      isTotal: false,
      isSubtotal: false,
      isPositive: item.amount >= 0,
      totalRevenue,
    };
  });
}

function getBarColor(bar: ComputedBar): string {
  if (bar.isTotal || bar.isSubtotal) return '#3b82f6'; // blue
  return bar.isPositive ? '#16a34a' : '#dc2626'; // green / red
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function WaterfallTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ComputedBar;
  if (!d) return null;
  const pctOfRevenue = d.totalRevenue ? ((d.amount / d.totalRevenue) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[180px]">
      <p className="font-semibold text-foreground">{d.category}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-semibold text-foreground">{formatMoneyCompact(d.amount)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">% of Revenue</span>
        <span className="font-semibold text-foreground">{pctOfRevenue}%</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PnlWaterfallChart({ data }: PnlWaterfallChartProps) {
  const computed = computeWaterfall(data);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">P&L Waterfall</h2>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No P&L data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">P&L Waterfall</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revenue build-up to net profit
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={computed}
          margin={{ top: 16, right: 16, bottom: 40, left: 10 }}
          barSize={32}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoneyCompact(v)}
            width={60}
          />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

          {/* Invisible bar for the start (base) */}
          <Bar dataKey="start" stackId="waterfall" fill="transparent" radius={0} />

          {/* Visible bar for the actual value */}
          <Bar
            dataKey={(entry: ComputedBar) => entry.end - entry.start}
            stackId="waterfall"
            radius={[3, 3, 0, 0]}
            name="Amount"
          >
            {computed.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-600" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-600" />
          Expense
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Total / Subtotal
        </span>
      </div>
    </div>
  );
}
