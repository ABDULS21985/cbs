import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface NavPoint { date: string; nav: number; aum?: number }

interface Props { data: NavPoint[]; height?: number }

export function NavHistoryChart({ data, height = 300 }: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No NAV history available.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="nav" name="NAV" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
