import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface LineChartDataPoint {
  month: string;
  volume: number;
}

export function LineChartWidget() {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboard.charts('monthly-volume'),
    queryFn: () => apiGet<LineChartDataPoint[]>('/api/v1/dashboard/charts/monthly-volume'),
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center items-center h-[280px]"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">No chart data available</p>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
        <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
