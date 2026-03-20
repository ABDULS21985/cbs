import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ReconciliationSession, ReconciliationEntry } from '../api/reconciliationApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number;
}

const BUCKETS: AgingBucket[] = [
  { label: '0-1d', minDays: 0, maxDays: 1 },
  { label: '2-3d', minDays: 2, maxDays: 3 },
  { label: '4-7d', minDays: 4, maxDays: 7 },
  { label: '8-14d', minDays: 8, maxDays: 14 },
  { label: '15-30d', minDays: 15, maxDays: 30 },
  { label: '30+', minDays: 31, maxDays: Infinity },
];

const BUCKET_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626'];

interface AgingDataPoint {
  bucket: string;
  ourBooks: number;
  bankStatement: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function bucketIndex(days: number): number {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (days >= BUCKETS[i].minDays && days <= BUCKETS[i].maxDays) return i;
  }
  return BUCKETS.length - 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AgingChartProps {
  sessions: ReconciliationSession[];
  onBucketClick?: (bucketLabel: string) => void;
}

export function AgingChart({ sessions, onBucketClick }: AgingChartProps) {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const data: AgingDataPoint[] = BUCKETS.map((b) => ({
      bucket: b.label,
      ourBooks: 0,
      bankStatement: 0,
      total: 0,
    }));

    sessions.forEach((session) => {
      // Our unmatched entries
      session.ourEntries
        .filter((e) => e.status === 'UNMATCHED' || e.status === 'PARTIAL')
        .forEach((e) => {
          const days = daysSince(e.date);
          const idx = bucketIndex(days);
          data[idx].ourBooks += 1;
          data[idx].total += 1;
        });

      // Bank unmatched entries
      session.bankEntries
        .filter((e) => e.status === 'UNMATCHED' || e.status === 'PARTIAL')
        .forEach((e) => {
          const days = daysSince(e.date);
          const idx = bucketIndex(days);
          data[idx].bankStatement += 1;
          data[idx].total += 1;
        });
    });

    return data;
  }, [sessions]);

  const totalBreaks = chartData.reduce((sum, d) => sum + d.total, 0);

  const handleClick = (entry: AgingDataPoint) => {
    setSelectedBucket((prev) => (prev === entry.bucket ? null : entry.bucket));
    onBucketClick?.(entry.bucket);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Break Aging Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{totalBreaks} total unmatched items</p>
        </div>
        {selectedBucket && (
          <button
            onClick={() => setSelectedBucket(null)}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} onClick={(state) => state?.activePayload?.[0] && handleClick(state.activePayload[0].payload)}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine
              x="4-7d"
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: '7-day regulatory threshold', position: 'top', fontSize: 10, fill: '#ef4444' }}
            />
            <Bar dataKey="ourBooks" name="Our Books" stackId="a" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.bucket}
                  fill={BUCKET_COLORS[index]}
                  opacity={selectedBucket && selectedBucket !== entry.bucket ? 0.3 : 1}
                  className="cursor-pointer"
                />
              ))}
            </Bar>
            <Bar dataKey="bankStatement" name="Bank Statement" stackId="a" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.bucket}
                  fill={BUCKET_COLORS[index]}
                  opacity={selectedBucket && selectedBucket !== entry.bucket ? 0.3 : 0.6}
                  className="cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
