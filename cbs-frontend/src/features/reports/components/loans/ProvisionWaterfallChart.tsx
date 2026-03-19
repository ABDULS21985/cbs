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
import { formatMoneyCompact } from '@/lib/formatters';
import type { ProvisionWaterfallItem } from '../../api/loanAnalyticsApi';

interface ProvisionWaterfallChartProps {
  items: ProvisionWaterfallItem[];
}

function getBarColor(type: ProvisionWaterfallItem['type'], value: number): string {
  if (type === 'opening' || type === 'closing') return '#3b82f6';
  if (type === 'add') return '#22c55e';
  return value < 0 ? '#ef4444' : '#f97316';
}

function buildWaterfallData(items: ProvisionWaterfallItem[]) {
  let runningBase = 0;

  return items.map((item) => {
    const isAnchor = item.type === 'opening' || item.type === 'closing';

    if (isAnchor) {
      // Anchors start from 0
      const result = {
        name: item.name,
        type: item.type,
        actualValue: item.value,
        spacer: 0,
        bar: item.value,
        isNegative: false,
        color: getBarColor(item.type, item.value),
      };
      if (item.type === 'opening') {
        runningBase = item.value;
      }
      return result;
    }

    // Movement bars
    const isNegative = item.value < 0;
    const absValue = Math.abs(item.value);

    if (isNegative) {
      // Downward bar: spacer = runningBase - absValue, bar = absValue
      const spacer = runningBase - absValue;
      const result = {
        name: item.name,
        type: item.type,
        actualValue: item.value,
        spacer: spacer,
        bar: absValue,
        isNegative: true,
        color: getBarColor(item.type, item.value),
      };
      runningBase -= absValue;
      return result;
    } else {
      // Upward bar: spacer = runningBase, bar = value
      const result = {
        name: item.name,
        type: item.type,
        actualValue: item.value,
        spacer: runningBase,
        bar: item.value,
        isNegative: false,
        color: getBarColor(item.type, item.value),
      };
      runningBase += item.value;
      return result;
    }
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p: any) => p.dataKey === 'bar');
  if (!entry) return null;
  const actualValue = entry.payload.actualValue as number;

  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Amount:{' '}
        <span className="font-medium" style={{ color: entry.payload.color }}>
          {actualValue >= 0 ? '+' : ''}{formatMoneyCompact(actualValue)}
        </span>
      </p>
    </div>
  );
}

export function ProvisionWaterfallChart({ items }: ProvisionWaterfallChartProps) {
  const chartData = buildWaterfallData(items);
  const maxValue = Math.max(...items.map((i) => Math.abs(i.value))) * 1.15;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Provision Waterfall</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Movement in loan loss provision over the period (₦)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 32, right: 16, bottom: 4, left: 16 }}
          barSize={52}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoneyCompact(v)}
            width={60}
            domain={[0, maxValue]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />

          {/* Invisible spacer bar */}
          <Bar dataKey="spacer" stackId="stack" fill="transparent" />

          {/* Visible waterfall bar */}
          <Bar dataKey="bar" stackId="stack" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              content={(props: any) => {
                const { x, y, width, value, index } = props;
                if (value === undefined || value === null) return null;
                const item = chartData[index];
                if (!item) return null;
                const display = item.isNegative
                  ? `-${formatMoneyCompact(Math.abs(item.actualValue))}`
                  : formatMoneyCompact(item.actualValue);
                return (
                  <text
                    x={x + width / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={item.color}
                  >
                    {display}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground border-t border-border pt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Opening / Closing Balance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Additions (new provisions)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          Reductions (write-backs, write-offs, recoveries)
        </span>
      </div>
    </div>
  );
}
