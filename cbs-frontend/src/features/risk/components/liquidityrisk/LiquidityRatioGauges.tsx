import type { LiquidityRatios } from '../../api/marketRiskApi';

interface GaugeProps { label: string; value: number; min: number; unit?: string }

function Gauge({ label, value, min, unit = '%' }: GaugeProps) {
  const pct = Math.min(100, (value / (min * 2)) * 100);
  const ok = value >= min;
  return (
    <div className="rounded-lg border bg-card p-5 text-center">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold font-mono ${ok ? 'text-green-600' : 'text-red-600'}`}>{value.toFixed(1)}{unit}</div>
      <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${ok ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">Min: {min}{unit} {ok ? '✅' : '❌'}</div>
    </div>
  );
}

interface Props { ratios: LiquidityRatios }

export function LiquidityRatioGauges({ ratios }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Gauge label="LCR" value={ratios.lcr} min={ratios.lcrMin} />
      <Gauge label="NSFR" value={ratios.nsfr} min={ratios.nsfrMin} />
      <Gauge label="Cash Reserve" value={ratios.cashReserve} min={ratios.cashReserveReq} />
    </div>
  );
}
