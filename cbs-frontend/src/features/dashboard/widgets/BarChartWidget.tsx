import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartWidgetProps {
  data?: { name: string; value: number }[];
  color?: string;
}

const defaultData = [
  { name: 'Lagos HQ', value: 890 }, { name: 'Abuja', value: 720 }, { name: 'PH', value: 580 },
  { name: 'Kano', value: 450 }, { name: 'Ibadan', value: 380 }, { name: 'Enugu', value: 340 },
];

export function BarChartWidget({ data = defaultData, color }: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis
          type="number"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickFormatter={(v) => `₦${v}M`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Bar dataKey="value" fill={color || 'hsl(var(--primary))'} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
