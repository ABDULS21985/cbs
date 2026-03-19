import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { communicationApi } from '../api/communicationApi';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

export function DeliveryDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['communications', 'stats'],
    queryFn: () => communicationApi.getDeliveryStats(),
  });

  if (!stats) return null;

  const chartData = [
    { name: 'Delivered', value: stats.delivered },
    { name: 'Failed', value: stats.failed },
    { name: 'Bounced', value: stats.bounced },
    { name: 'Pending', value: stats.totalSent - stats.delivered - stats.failed - stats.bounced },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Delivery Statistics</h3>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{stats.totalSent.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Sent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-green-600">{stats.delivered.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Delivered</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-red-600">{stats.failed.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-primary">{stats.deliveryRate.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Delivery Rate</div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
