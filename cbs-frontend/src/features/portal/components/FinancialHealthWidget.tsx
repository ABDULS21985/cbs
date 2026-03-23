import type { FinancialHealthSummary } from '../types/dashboard';
import { formatPercent } from '@/lib/formatters';

const RISK_COLORS: Record<string, string> = {
  LOW: 'text-green-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
  UNKNOWN: 'text-muted-foreground',
};

const RISK_BG: Record<string, string> = {
  LOW: 'stroke-green-500',
  MEDIUM: 'stroke-yellow-500',
  HIGH: 'stroke-orange-500',
  CRITICAL: 'stroke-red-500',
  UNKNOWN: 'stroke-muted',
};

interface FinancialHealthWidgetProps {
  health: FinancialHealthSummary;
}

export function FinancialHealthWidget({ health }: FinancialHealthWidgetProps) {
  const { score, riskLevel, savingsRate, factors, insights } = health;

  // SVG circular gauge
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeColor = RISK_BG[riskLevel] || RISK_BG.UNKNOWN;

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Financial Health</h3>
      <div className="flex items-center gap-6">
        {/* Circular Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64" cy="64" r={radius}
              fill="none" strokeWidth="10"
              className="stroke-muted/30"
            />
            <circle
              cx="64" cy="64" r={radius}
              fill="none" strokeWidth="10"
              className={strokeColor}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Factors */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Risk Level</span>
            <span className={`text-xs font-semibold ${RISK_COLORS[riskLevel] || ''}`}>
              {riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Savings Rate</span>
            <span className="text-xs font-semibold">{formatPercent(savingsRate)}</span>
          </div>
          {factors.savings_ratio != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Savings Ratio</span>
              <span className="text-xs font-semibold">
                {formatPercent(Number(factors.savings_ratio))}
              </span>
            </div>
          )}
          {factors.expense_control != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expense Control</span>
              <span className="text-xs font-semibold">{String(factors.expense_control)}</span>
            </div>
          )}

          {/* Insights */}
          {Object.entries(insights).map(([key, value]) => (
            <p key={key} className={`text-xs ${key === 'warning' ? 'text-amber-600' : key === 'positive' ? 'text-green-600' : 'text-muted-foreground'}`}>
              {value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
