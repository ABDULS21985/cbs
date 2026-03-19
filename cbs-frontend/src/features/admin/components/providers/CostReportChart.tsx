import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CostRecord } from '../../api/providerApi';

interface CostReportChartProps { records: CostRecord[]; }

export function CostReportChart({ records }: CostReportChartProps) {
  const data = records.map(r => ({
    name: r.providerName,
    monthlyCost: Number(r.monthlyCost ?? 0),
    estimatedCost: Number(r.estimatedMonthlyCost ?? 0),
  }));
  if (data.length === 0) return <div className="text-sm text-muted-foreground text-center py-12">No cost data available.</div>;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 40, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
        <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <Bar dataKey="monthlyCost" name="Monthly Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="estimatedCost" name="Estimated Cost" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
