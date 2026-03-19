import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeftRight } from 'lucide-react';
import type { StageMigration } from '../../types/ecl';

interface Props {
  data: StageMigration[];
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#22c55e',
  'Stage 2': '#f59e0b',
  'Stage 3': '#ef4444',
};

const STAGES = ['Stage 1', 'Stage 2', 'Stage 3'];
const FROM_LABELS = ['From Stage 1', 'From Stage 2', 'From Stage 3'];

export function StageMigrationChart({ data }: Props) {
  const chartData = useMemo(() => {
    return STAGES.map((fromStage, i) => {
      const row: Record<string, string | number> = { name: FROM_LABELS[i] };
      STAGES.forEach((toStage) => {
        const migration = data.find((m) => m.from === fromStage && m.to === toStage);
        row[toStage] = migration?.amount ?? 0;
      });
      return row;
    });
  }, [data]);

  if (!data || data.length === 0) {
    return <EmptyState icon={ArrowLeftRight} title="No migration data for this period" />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => formatMoneyCompact(value)} />
        <Legend />
        {STAGES.map((stage) => (
          <Bar
            key={stage}
            dataKey={stage}
            fill={STAGE_COLORS[stage]}
            name={stage}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
