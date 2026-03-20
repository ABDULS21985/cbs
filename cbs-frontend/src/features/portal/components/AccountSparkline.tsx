import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface AccountSparklineProps {
  data: number[];
  color?: string;
}

export function AccountSparkline({ data, color = '#6366F1' }: AccountSparklineProps) {
  const chartData = data.map((value, index) => ({ day: index, value }));
  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0];
  const lineColor = color === 'auto' ? (isPositive ? '#22C55E' : '#EF4444') : color;

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
