import type { Kri } from '../../api/opriskApi';

const statusColors = { GREEN: 'text-green-600', AMBER: 'text-amber-600', RED: 'text-red-600' };
const barColors = { GREEN: 'bg-green-500', AMBER: 'bg-amber-500', RED: 'bg-red-500' };

interface Props { kri: Kri; onClick?: () => void }

export function KriCard({ kri, onClick }: Props) {
  const pct = Math.min(100, (kri.currentValue / kri.redThreshold) * 100);

  return (
    <button onClick={onClick} className="text-left rounded-lg border bg-card p-4 hover:shadow-md transition-shadow w-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium truncate">{kri.name}</h4>
        <span className={`text-xs font-semibold ${statusColors[kri.status]}`}>{kri.status === 'RED' ? '🔴' : kri.status === 'AMBER' ? '🟡' : '🟢'}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${statusColors[kri.status]}`}>
        {kri.currentValue.toLocaleString()}{kri.unit ? ` ${kri.unit}` : ''}
      </div>
      <div className="text-xs text-muted-foreground mt-1">Threshold: {kri.redThreshold}{kri.unit ? ` ${kri.unit}` : ''}</div>
      <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColors[kri.status]}`} style={{ width: `${pct}%` }} />
      </div>
      {/* Sparkline — simplified trend dots */}
      <div className="flex items-end gap-px mt-2 h-4">
        {kri.trendData.slice(-20).map((d, i) => {
          const max = Math.max(...kri.trendData.map((t) => t.value)) || 1;
          const h = Math.max(2, (d.value / max) * 16);
          return <div key={i} className={`w-1 rounded-full ${barColors[kri.status]} opacity-60`} style={{ height: `${h}px` }} />;
        })}
      </div>
    </button>
  );
}
