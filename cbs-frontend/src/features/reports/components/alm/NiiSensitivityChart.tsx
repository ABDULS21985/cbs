import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { almReportApi, type NiiScenario } from '../../api/almReportApi';

interface NiiSensitivityChartProps {
  asOfDate: string;
}

function formatBps(bps: number): string {
  if (bps === 0) return 'Base';
  return bps > 0 ? `+${bps}` : `${bps}`;
}

function formatBillions(value: number) {
  if (Math.abs(value) >= 1e12) return `₦${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `₦${(value / 1e9).toFixed(1)}B`;
  return `₦${value.toLocaleString()}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const scenario: NiiScenario = entry?.payload;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-sm mb-1">
        {scenario.rateChangeBps === 0 ? 'Base Scenario' : `Rate ${label} bps`}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">NII</span>
        <span className="font-mono font-medium">{formatBillions(entry.value)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Change</span>
        <span className={`font-mono font-medium ${scenario.niiChangePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {scenario.niiChangePct === 0 ? '—' : (scenario.niiChangePct > 0 ? '+' : '') + scenario.niiChangePct.toFixed(1) + '%'}
        </span>
      </div>
    </div>
  );
}

export function NiiSensitivityChart({ asOfDate }: NiiSensitivityChartProps) {
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['nii-sensitivity', asOfDate],
    queryFn: () => almReportApi.getNiiSensitivity(asOfDate),
  });

  const base = scenarios.find((s) => s.baseNii);
  const baseNii = base?.niiImpact ?? 0;

  const chartData = scenarios.map((s) => ({ ...s, label: formatBps(s.rateChangeBps) }));

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">NII by Rate Scenario</h3>
      <p className="text-xs text-muted-foreground mb-4">Net Interest Income sensitivity across rate change scenarios</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tickFormatter={(v) => `₦${(v / 1e9).toFixed(0)}B`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={baseNii}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 3"
            label={{ value: 'Base NII', position: 'insideTopRight', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Bar dataKey="niiImpact" name="NII" radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.rateChangeBps}
                fill={entry.niiChangePct >= 0 ? '#22c55e' : '#ef4444'}
                opacity={entry.baseNii ? 1 : 0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
