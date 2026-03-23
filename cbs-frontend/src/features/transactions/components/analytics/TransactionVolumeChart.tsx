import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { TransactionVolumeTrendPoint } from '../../api/transactionAnalyticsApi';

interface TransactionVolumeChartProps {
  data: TransactionVolumeTrendPoint[];
  priorData?: TransactionVolumeTrendPoint[];
  isLoading?: boolean;
  onPointClick?: (point: TransactionVolumeTrendPoint) => void;
}

function buildChartData(data: TransactionVolumeTrendPoint[], priorData: TransactionVolumeTrendPoint[]) {
  return data.map((point, index) => ({
    ...point,
    totalCount: point.creditCount + point.debitCount,
    priorCreditCount: priorData[index]?.creditCount ?? null,
    priorDebitCount: priorData[index]?.debitCount ?? null,
  }));
}

export function TransactionVolumeChart({
  data,
  priorData = [],
  isLoading = false,
  onPointClick,
}: TransactionVolumeChartProps) {
  if (isLoading) {
    return <div className="h-[320px] animate-pulse surface-card" />;
  }

  const chartData = buildChartData(data, priorData);

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Transaction Volume Trend</h2>
        <p className="text-sm text-muted-foreground">
          Credit and debit flow over time with total value on a secondary axis.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          onClick={(state) => {
            const point = state?.activePayload?.[0]?.payload as TransactionVolumeTrendPoint | undefined;
            if (point) onPointClick?.(point);
          }}
        >
          <defs>
            <linearGradient id="txn-credit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="txn-debit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="count" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis
            yAxisId="value"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatMoneyCompact(Number(value))}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name.toLowerCase().includes('value')) {
                return [formatMoneyCompact(value), name];
              }
              return [value.toLocaleString(), name];
            }}
          />
          <Legend />
          <Area yAxisId="count" type="monotone" dataKey="creditCount" name="Credits" stroke="#2563eb" fill="url(#txn-credit)" strokeWidth={2} />
          <Area yAxisId="count" type="monotone" dataKey="debitCount" name="Debits" stroke="#dc2626" fill="url(#txn-debit)" strokeWidth={2} />
          <Line yAxisId="value" type="monotone" dataKey="totalValue" name="Total Value" stroke="#0f172a" strokeWidth={2} dot={false} />
          {priorData.length > 0 && (
            <>
              <Line yAxisId="count" type="monotone" dataKey="priorCreditCount" name="Prior Credits" stroke="#93c5fd" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              <Line yAxisId="count" type="monotone" dataKey="priorDebitCount" name="Prior Debits" stroke="#fca5a5" strokeDasharray="4 4" strokeWidth={2} dot={false} />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
