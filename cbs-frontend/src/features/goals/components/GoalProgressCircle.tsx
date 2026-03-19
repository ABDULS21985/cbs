import { cn } from '@/lib/utils';

interface GoalProgressCircleProps {
  percentage: number;
  size?: number;
  color?: string;
  className?: string;
}

export function GoalProgressCircle({ percentage, size = 200, color, className }: GoalProgressCircleProps) {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPct / 100) * circumference;
  const center = size / 2;

  const trackColor = 'hsl(var(--muted))';
  const progressColor = color ?? (
    clampedPct >= 100 ? '#22c55e' :
    clampedPct >= 75 ? '#3b82f6' :
    clampedPct >= 50 ? 'hsl(var(--primary))' :
    clampedPct >= 25 ? '#f59e0b' :
    '#f87171'
  );

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-label={`${clampedPct.toFixed(1)}% progress`}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none"
          style={{ fontSize: size * 0.18, color: progressColor }}
        >
          {clampedPct.toFixed(0)}%
        </span>
        <span className="text-muted-foreground mt-1" style={{ fontSize: size * 0.07 }}>
          Complete
        </span>
      </div>
    </div>
  );
}
