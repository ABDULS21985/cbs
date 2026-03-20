import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StabilityFactor {
  name: string;
  contribution: number;
  status: 'positive' | 'neutral' | 'negative';
}

interface DepositStabilityGaugeProps {
  score: number; // 0–100
  factors?: StabilityFactor[];
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getZone(score: number): { label: string; color: string; bgColor: string; textColor: string } {
  if (score >= 80) return { label: 'Stable', color: '#16a34a', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' };
  if (score >= 50) return { label: 'Moderate', color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' };
  return { label: 'At Risk', color: '#dc2626', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' };
}

function getFactorStatusColor(status: string): string {
  switch (status) {
    case 'positive': return 'text-green-600 dark:text-green-400';
    case 'negative': return 'text-red-600 dark:text-red-400';
    default: return 'text-amber-600 dark:text-amber-400';
  }
}

function getFactorStatusIcon(status: string): string {
  switch (status) {
    case 'positive': return '\u25B2';
    case 'negative': return '\u25BC';
    default: return '\u25C6';
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GaugeSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
      <div className="h-4 w-48 bg-muted rounded mb-4" />
      <div className="h-32 w-32 mx-auto bg-muted rounded-full mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DepositStabilityGauge({ score, factors = [], isLoading }: DepositStabilityGaugeProps) {
  if (isLoading) return <GaugeSkeleton />;

  const zone = getZone(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  // Semi-circle gauge data
  const gaugeData = [
    { value: clampedScore, fill: zone.color },
    { value: 100 - clampedScore, fill: 'hsl(var(--muted))' },
  ];

  // Zone markers for the gauge background
  const zoneData = [
    { value: 49, fill: '#fecaca' },  // Red zone 0-49
    { value: 30, fill: '#fde68a' },  // Amber zone 50-79
    { value: 21, fill: '#bbf7d0' },  // Green zone 80-100
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4" aria-label={`Deposit stability score: ${score}`}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">Deposit Stability Index</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Composite stability score based on concentration, volatility, and tenure metrics
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        {/* Semi-circle gauge */}
        <div className="relative" style={{ width: 220, height: 130 }}>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              {/* Background zones */}
              <Pie
                data={zoneData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={80}
                dataKey="value"
                isAnimationActive={false}
                stroke="none"
              >
                {zoneData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              {/* Score indicator */}
              <Pie
                data={gaugeData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={85}
                outerRadius={105}
                dataKey="value"
                stroke="none"
              >
                {gaugeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-3xl font-bold text-foreground">{Math.round(clampedScore)}</div>
            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', zone.bgColor, zone.textColor)}>
              {zone.label}
            </span>
          </div>
        </div>

        {/* Zone labels */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-red-300" />
            0-49 At Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-300" />
            50-79 Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-green-300" />
            80-100 Stable
          </span>
        </div>
      </div>

      {/* Factor breakdown */}
      {factors.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contributing Factors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {factors.map((factor) => (
              <div
                key={factor.name}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="text-xs text-foreground">{factor.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', getFactorStatusColor(factor.status))}>
                    {getFactorStatusIcon(factor.status)} {factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
