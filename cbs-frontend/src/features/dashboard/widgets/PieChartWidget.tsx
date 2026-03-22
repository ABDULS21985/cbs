import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CHART_PALETTE } from '@/lib/chartPalette';

const data = [
  { name: 'Savings', value: 35 }, { name: 'Current', value: 28 }, { name: 'Fixed Deposit', value: 22 },
  { name: 'Domiciliary', value: 10 }, { name: 'Other', value: 5 },
];

const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
    <tspan x={cx} dy="-6" className="text-2xl font-bold fill-foreground">100%</tspan>
    <tspan x={cx} dy="20" className="text-xs fill-muted-foreground">Total</tspan>
  </text>
);

export function PieChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={3}
          dataKey="value"
          label={false}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} strokeWidth={0} />
          ))}
          {renderCustomLabel({ cx: 200, cy: 140 })}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number) => `${value}%`}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          formatter={(value) => <span className="text-muted-foreground ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
