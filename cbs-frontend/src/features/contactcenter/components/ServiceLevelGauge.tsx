import { cn } from '@/lib/utils';

interface ServiceLevelGaugeProps {
  value: number;
  target?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ServiceLevelGauge({ value, target = 80, size = 'md', label = 'SLA' }: ServiceLevelGaugeProps) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 90 ? '#22c55e' : pct >= target ? '#f59e0b' : '#ef4444';
  const r = size === 'lg' ? 45 : size === 'sm' ? 32 : 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const svgSize = size === 'lg' ? 120 : size === 'sm' ? 80 : 100;
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';

  return (
    <div className={cn('relative', `w-${svgSize / 4} h-${svgSize / 4}`)} style={{ width: svgSize, height: svgSize }}>
      <svg className="-rotate-90" viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
        <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold font-mono', textSize)} style={{ color }}>{pct.toFixed(0)}%</span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}
