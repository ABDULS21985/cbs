import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: 'Savings', value: 35 }, { name: 'Current', value: 28 }, { name: 'Fixed Deposit', value: 22 },
  { name: 'Domiciliary', value: 10 }, { name: 'Other', value: 5 },
];

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(43, 74%, 49%)', 'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(215, 16%, 47%)'];

export function PieChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
          {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => `${value}%`} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
