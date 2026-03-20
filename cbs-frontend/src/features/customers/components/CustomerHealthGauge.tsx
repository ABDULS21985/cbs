import { cn } from '@/lib/utils';
import type { HealthScore } from '../types/customer';

interface CustomerHealthGaugeProps {
  healthScore?: HealthScore;
  isLoading: boolean;
  size?: 'sm' | 'md';
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function gradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    NEEDS_ATTENTION: 'Needs Attention',
    AT_RISK: 'At Risk',
  };
  return labels[grade] || grade;
}

export function CustomerHealthGauge({ healthScore, isLoading, size = 'md' }: CustomerHealthGaugeProps) {
  if (isLoading) {
    return <div className={cn('rounded-full bg-muted animate-pulse', size === 'sm' ? 'w-12 h-12' : 'w-16 h-16')} />;
  }

  if (!healthScore) return null;

  const score = healthScore.totalScore;
  const color = scoreColor(score);
  const r = size === 'sm' ? 20 : 28;
  const svgSize = size === 'sm' ? 48 : 64;
  const sw = size === 'sm' ? 4 : 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="relative group" title={`Health Score: ${score} — ${gradeLabel(healthScore.grade)}`}>
      <svg className="-rotate-90" viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
        <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/20" />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold font-mono tabular-nums', textSize)} style={{ color }}>{score}</span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-56">
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Health Score</span>
            <span className="font-bold" style={{ color }}>{score}/100 — {gradeLabel(healthScore.grade)}</span>
          </div>
          {healthScore.factors.map((f) => (
            <div key={f.name} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{f.name}</span>
                <span className="tabular-nums">{f.score}/{f.weight * 100}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${f.weight > 0 ? (f.score / (f.weight * 100)) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
