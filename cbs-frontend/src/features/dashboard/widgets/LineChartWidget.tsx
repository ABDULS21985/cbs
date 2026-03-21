import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
      <AreaChart data={data}>
        <defs>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            fontSize: '12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Area type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#volumeGradient)" dot={false} activeDot={{ r: 5, strokeWidth: 2, fill: 'hsl(var(--card))' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
