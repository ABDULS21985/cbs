import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/formatters';

const COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AllocationItem {
  assetClass: string;
  totalValue: number;
  weight: number;
  ytdReturn: number;
}

interface Props {
  data: AllocationItem[];
  currency?: string;
}

export function AggregateAllocationChart({ data, currency = 'NGN' }: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No allocation data available.</div>;
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold mb-4">Aggregate Asset Allocation</h3>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="totalValue" nameKey="assetClass" paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 font-medium">Asset Class</th>
                <th className="pb-2 font-medium text-right">Value</th>
                <th className="pb-2 font-medium text-right">Weight</th>
                <th className="pb-2 font-medium text-right">YTD Return</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item, i) => (
                <tr key={item.assetClass}>
                  <td className="py-2 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {item.assetClass.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2 text-right font-mono">{formatMoney(item.totalValue, currency)}</td>
                  <td className="py-2 text-right">{item.weight.toFixed(1)}%</td>
                  <td className={`py-2 text-right font-mono ${item.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.ytdReturn >= 0 ? '+' : ''}{item.ytdReturn.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
