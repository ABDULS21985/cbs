import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VintageCohort {
  cohort: string;
  months: number[];
  defaultRates: number[];
  predicted?: boolean[];
}

interface VintageAnalysisChartProps {
  data: VintageCohort[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COHORT_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#6366f1',
];

interface ChartPoint {
  month: number;
  [cohort: string]: number | undefined;
}

function buildChartData(cohorts: VintageCohort[]): ChartPoint[] {
  const allMonths = new Set<number>();
  for (const c of cohorts) {
    for (const m of c.months) allMonths.add(m);
  }
  const sortedMonths = Array.from(allMonths).sort((a, b) => a - b);

  return sortedMonths.map((month) => {
    const point: ChartPoint = { month };
    for (const c of cohorts) {
      const idx = c.months.indexOf(month);
      if (idx !== -1) {
        point[c.cohort] = c.defaultRates[idx];
      }
    }
    return point;
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function VintageTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">Month {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.dataKey}</span>
          </span>
          <span className="font-semibold text-foreground">{p.value?.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VintageAnalysisChart({ data }: VintageAnalysisChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Vintage Analysis</h2>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No vintage cohort data available
        </div>
      </div>
    );
  }

  const chartData = buildChartData(data);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Vintage Analysis — Cohort Default Curves</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cumulative default rate by months since origination. Dashed lines indicate predicted trajectories.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Months Since Origination', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={45}
            label={{ value: 'Default Rate %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<VintageTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="line"
            iconSize={12}
          />
          {data.map((cohort, i) => {
            const hasPredicted = cohort.predicted?.some(Boolean);
            return (
              <Line
                key={cohort.cohort}
                type="monotone"
                dataKey={cohort.cohort}
                stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
                strokeWidth={2}
                strokeDasharray={hasPredicted ? '6 3' : undefined}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
