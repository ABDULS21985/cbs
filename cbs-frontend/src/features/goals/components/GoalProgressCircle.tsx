import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GoalProgressCircleProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const SIZES = { sm: 60, md: 120, lg: 200 };

function getGradientId(pct: number) {
  if (pct >= 100) return 'goal-grad-gold';
  if (pct >= 66) return 'goal-grad-green';
  if (pct >= 33) return 'goal-grad-blue';
  return 'goal-grad-start';
}

export function GoalProgressCircle({ percentage, size = 'md', className, animate = true }: GoalProgressCircleProps) {
  const dim = SIZES[size];
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const sw = dim * 0.08;
  const r = (dim - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const center = dim / 2;

  const [displayPct, setDisplayPct] = useState(animate ? 0 : clampedPct);
  const [displayNum, setDisplayNum] = useState(animate ? 0 : clampedPct);

  useEffect(() => {
    if (!animate) { setDisplayPct(clampedPct); setDisplayNum(clampedPct); return; }
    const timer = setTimeout(() => setDisplayPct(clampedPct), 100);
    // Animate counter
    const duration = 1000;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNum(Math.round(eased * clampedPct));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => clearTimeout(timer);
  }, [clampedPct, animate]);

  const offset = circumference - (displayPct / 100) * circumference;
  const gradId = getGradientId(clampedPct);
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-3xl' : 'text-lg';
  const labelSize = size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-sm' : 'text-[10px]';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90" aria-label={`${clampedPct.toFixed(0)}% progress`}>
        <defs>
          <linearGradient id="goal-grad-start" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="goal-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="goal-grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="goal-grad-gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/20" />
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold tabular-nums leading-none', textSize)}>{displayNum}%</span>
        {size !== 'sm' && <span className={cn('text-muted-foreground mt-0.5', labelSize)}>Complete</span>}
      </div>
      {/* Sparkle at 100% */}
      {clampedPct >= 100 && size !== 'sm' && (
        <div className="absolute inset-0 pointer-events-none">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"
              style={{
                top: `${50 - 45 * Math.cos((deg * Math.PI) / 180)}%`,
                left: `${50 + 45 * Math.sin((deg * Math.PI) / 180)}%`,
                animationDelay: `${deg * 3}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
