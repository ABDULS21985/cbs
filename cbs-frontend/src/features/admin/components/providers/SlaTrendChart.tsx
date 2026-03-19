import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { SlaRecord } from '../../api/providerApi';

interface SlaTrendChartProps { records: SlaRecord[]; slaTarget?: number; }

export function SlaTrendChart({ records, slaTarget = 99.9 }: SlaTrendChartProps) {
  const data = records.map(r => ({
    name: r.providerName,
    uptime: r.actualUptimePct != null ? Number(r.actualUptimePct) : 0,
    slaMet: r.slaMet,
  }));
  if (data.length === 0) return <div className="text-sm text-muted-foreground text-center py-12">No SLA trend data available.</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 40, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`}
          domain={[Math.max(90, Math.min(...data.map(d => d.uptime)) - 1), 100]} className="fill-muted-foreground" />
        <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <ReferenceLine y={slaTarget} stroke="#3b82f6" strokeDasharray="6 4" strokeOpacity={0.7}
          label={{ value: `SLA ${slaTarget}%`, position: 'insideTopLeft', fontSize: 10, fill: '#3b82f6' }} />
        <Line type="monotone" dataKey="uptime" name="Actual Uptime %" stroke="#10b981" strokeWidth={2}
          dot={({ cx, cy, payload }: { cx: number; cy: number; payload: { slaMet: boolean } }) => (
            <circle key={cx} cx={cx} cy={cy} r={5} fill={payload.slaMet ? '#10b981' : '#ef4444'} stroke="none" />
          )} />
      </LineChart>
    </ResponsiveContainer>
  );
}
