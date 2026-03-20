import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatMoney } from '@/lib/formatters';

const BUCKET_COLORS: Record<string, string> = {
  'T+1': '#22c55e',
  'T+2': '#84cc16',
  'T+3-5': '#eab308',
  'T+6-10': '#f97316',
  'T+11-20': '#ef4444',
  'T+20+': '#dc2626',
};

const BUCKET_ORDER = ['T+1', 'T+2', 'T+3-5', 'T+6-10', 'T+11-20', 'T+20+'];

interface BucketData {
  bucket: string;
  count: number;
  amount: number;
}

interface AgingBucketChartProps {
  data: BucketData[];
  onBucketClick?: (bucket: string) => void;
}

export function AgingBucketChart({ data, onBucketClick }: AgingBucketChartProps) {
  // Sort by bucket order
  const sorted = [...data].sort((a, b) => {
    const ai = BUCKET_ORDER.indexOf(a.bucket);
    const bi = BUCKET_ORDER.indexOf(b.bucket);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (sorted.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-12">No aging data available.</div>;
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
          <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} className="fill-muted-foreground" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as BucketData;
              return (
                <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
                  <p className="font-semibold mb-1">{d.bucket}</p>
                  <p>Fails: <strong>{d.count}</strong></p>
                  <p>Amount: <strong>{formatMoney(d.amount)}</strong></p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer"
            onClick={(data) => onBucketClick?.(data.bucket)}>
            {sorted.map((entry) => (
              <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {sorted.map(d => (
          <button key={d.bucket} onClick={() => onBucketClick?.(d.bucket)}
            className="flex items-center gap-1.5 text-xs hover:underline">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: BUCKET_COLORS[d.bucket] || '#6b7280' }} />
            <span>{d.bucket}: <strong>{d.count}</strong> ({formatMoney(d.amount)})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
