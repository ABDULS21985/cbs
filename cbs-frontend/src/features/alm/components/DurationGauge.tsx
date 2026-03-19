import { cn } from '@/lib/utils';

interface DurationGaugeProps {
  value: number;
  min?: number;
  max?: number;
}

export function DurationGauge({ value, min = -4, max = 4 }: DurationGaugeProps) {
  const range = max - min;
  const clampedValue = Math.max(min, Math.min(max, value));
  // Map value to 0-180 degrees (left=min, right=max)
  const angle = ((clampedValue - min) / range) * 180;

  // SVG geometry
  const cx = 150;
  const cy = 140;
  const r = 110;
  const strokeWidth = 24;

  // Arc helper: angle in degrees (0=left, 180=right)
  const polarToCartesian = (angleDeg: number) => {
    const rad = ((180 - angleDeg) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };

  const arcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Zone boundaries in degrees
  const greenStart = (((-1.5 - min) / range) * 180);
  const greenEnd = (((1.5 - min) / range) * 180);
  const amberLeftStart = (((-2.5 - min) / range) * 180);
  const amberRightEnd = (((2.5 - min) / range) * 180);

  // Needle endpoint
  const needleEnd = polarToCartesian(angle);
  const needleLen = r - strokeWidth / 2 - 8;
  const needleRad = ((180 - angle) * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy - needleLen * Math.sin(needleRad);

  // Determine zone
  const absVal = Math.abs(value);
  const zone = absVal <= 1.5 ? 'green' : absVal <= 2.5 ? 'amber' : 'red';
  const sensitivity = value > 0 ? 'ASSET-SENSITIVE' : value < 0 ? 'LIABILITY-SENSITIVE' : 'IMMUNIZED';

  const zoneColors = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 170" className="w-full max-w-[320px]">
        {/* Red zone (far left) */}
        <path d={arcPath(0, amberLeftStart)} fill="none" stroke="hsl(0 84% 60%)" strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.25} />
        {/* Amber zone (left) */}
        <path d={arcPath(amberLeftStart, greenStart)} fill="none" stroke="hsl(38 92% 50%)" strokeWidth={strokeWidth} opacity={0.3} />
        {/* Green zone (center) */}
        <path d={arcPath(greenStart, greenEnd)} fill="none" stroke="hsl(142 71% 45%)" strokeWidth={strokeWidth} opacity={0.35} />
        {/* Amber zone (right) */}
        <path d={arcPath(greenEnd, amberRightEnd)} fill="none" stroke="hsl(38 92% 50%)" strokeWidth={strokeWidth} opacity={0.3} />
        {/* Red zone (far right) */}
        <path d={arcPath(amberRightEnd, 180)} fill="none" stroke="hsl(0 84% 60%)" strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.25} />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--foreground))" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill="hsl(var(--foreground))" />
        <circle cx={cx} cy={cy} r={3} fill="hsl(var(--background))" />

        {/* Value label */}
        <text x={cx} y={cy + 30} textAnchor="middle" className="fill-foreground text-xl font-bold" fontSize={22}>
          {value >= 0 ? '+' : ''}{value.toFixed(2)}Y
        </text>

        {/* Scale labels */}
        <text x={20} y={cy + 10} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{min}Y</text>
        <text x={280} y={cy + 10} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>+{max}Y</text>
        <text x={cx} y={22} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>0Y</text>
      </svg>

      <div className="text-center -mt-2">
        <p className={cn('text-sm font-semibold', zoneColors[zone])}>
          Your portfolio is {sensitivity} by {Math.abs(value).toFixed(2)} years
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {zone === 'green' && 'Duration gap within acceptable range'}
          {zone === 'amber' && 'Duration gap approaching risk limits'}
          {zone === 'red' && 'Duration gap exceeds risk tolerance — action required'}
        </p>
      </div>
    </div>
  );
}
