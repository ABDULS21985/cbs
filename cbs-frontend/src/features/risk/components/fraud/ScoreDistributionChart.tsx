import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ScoreDistributionBucket } from '../../types/fraud';

interface Props {
  data: ScoreDistributionBucket[];
}

export function ScoreDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Alert Score Distribution
        </h4>
        <div className="text-sm text-muted-foreground">No scored alerts were returned for this distribution.</div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Alert Score Distribution
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="open" name="Open / Investigating" fill="#f97316" maxBarSize={16} radius={[2, 2, 0, 0]} />
          <Bar dataKey="resolved" name="Resolved / Closed" fill="#3b82f6" maxBarSize={16} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Buckets show how current backlog compares with closed alert volume across risk bands.
      </p>
    </div>
  );
}
