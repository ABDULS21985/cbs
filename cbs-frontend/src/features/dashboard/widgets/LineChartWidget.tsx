import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { month: 'Apr', volume: 12400 }, { month: 'May', volume: 13200 }, { month: 'Jun', volume: 11800 },
  { month: 'Jul', volume: 14500 }, { month: 'Aug', volume: 15200 }, { month: 'Sep', volume: 14800 },
  { month: 'Oct', volume: 16100 }, { month: 'Nov', volume: 15600 }, { month: 'Dec', volume: 17200 },
  { month: 'Jan', volume: 16800 }, { month: 'Feb', volume: 18100 }, { month: 'Mar', volume: 19500 },
];

export function LineChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={mockData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
        <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
