import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

interface ExposureGaugeProps {
  current: number;
  limit: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ExposureGauge({ current, limit, currency = 'NGN', size = 'md' }: ExposureGaugeProps) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const color = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';

  const dims = size === 'lg' ? { w: 200, h: 120, r: 70, sw: 14, text: 'text-3xl' }
    : size === 'sm' ? { w: 120, h: 72, r: 42, sw: 8, text: 'text-lg' }
    : { w: 160, h: 96, r: 56, sw: 10, text: 'text-2xl' };

  const cx = dims.w / 2;
  const cy = dims.h - 10;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - (startAngle - endAngle) * (pct / 100);

  const bgPath = describeArc(cx, cy, dims.r, endAngle, startAngle);
  const valuePath = describeArc(cx, cy, dims.r, sweepAngle, startAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}>
        <path d={bgPath} fill="none" stroke="currentColor" strokeWidth={dims.sw} strokeLinecap="round" className="text-muted/20" />
        <path
          d={valuePath}
          fill="none"
          stroke={color}
          strokeWidth={dims.sw}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center -mt-2">
        <span className={cn('font-bold font-mono tabular-nums', dims.text)} style={{ color }}>
          {pct.toFixed(1)}%
        </span>
        <div className="flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatMoneyCompact(current, currency)}</span>
          <span>/</span>
          <span>{formatMoneyCompact(limit, currency)}</span>
        </div>
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}
