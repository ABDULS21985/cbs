import { cn } from '@/lib/utils';

interface SlaComplianceGaugeProps {
  productName: string;
  targetUptime: number;
  actualUptime: number;
  size?: number;
}

export function SlaComplianceGauge({
  productName,
  targetUptime,
  actualUptime,
  size = 120,
}: SlaComplianceGaugeProps) {
  const isMeeting = actualUptime >= targetUptime;
  const percentage = Math.min(actualUptime, 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  const strokeColor = isMeeting
    ? 'stroke-green-500'
    : actualUptime >= targetUptime - 0.5
      ? 'stroke-amber-500'
      : 'stroke-red-500';

  const textColor = isMeeting
    ? 'text-green-600 dark:text-green-400'
    : actualUptime >= targetUptime - 0.5
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div className="ob-monitor-panel-muted flex flex-col items-center gap-3 rounded-[1.4rem] border border-border/60 px-4 py-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-700 ease-out', strokeColor)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold tabular-nums', textColor)}>
            {actualUptime.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium truncate max-w-[140px]">{productName}</p>
        <p className="text-[10px] text-muted-foreground">
          Target: {targetUptime.toFixed(2)}%
        </p>
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-1',
            isMeeting
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}
        >
          {isMeeting ? 'Meeting SLA' : 'Breaching SLA'}
        </span>
      </div>
    </div>
  );
}
