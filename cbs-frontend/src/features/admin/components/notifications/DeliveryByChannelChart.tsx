import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DeliveryByChannelEntry } from '../../api/notificationAdminApi';

interface DeliveryByChannelChartProps { data: DeliveryByChannelEntry[]; }

export function DeliveryByChannelChart({ data }: DeliveryByChannelChartProps) {
  if (data.length === 0) return <div className="text-sm text-muted-foreground text-center py-12">No channel data.</div>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="channel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={6} />
        <Bar dataKey="sent" name="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
