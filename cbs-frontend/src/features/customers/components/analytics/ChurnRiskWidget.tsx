import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle, Phone, Gift, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChurnRiskData } from '../../api/analyticsApi';

const RISK_COLORS = {
  LOW: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', ring: 'ring-green-500' },
  MEDIUM: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-500' },
  HIGH: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-500' },
};

const ACTION_ICONS: Record<string, typeof Phone> = {
  'Schedule RM Call': Phone,
  'Send Retention Offer': Gift,
  'Assign to Retention Team': Users,
};

interface Props {
  data: ChurnRiskData;
  customerId: number;
}

export function ChurnRiskWidget({ data, customerId }: Props) {
  const navigate = useNavigate();
  const colors = RISK_COLORS[data.riskLevel];

  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <div className={cn('rounded-xl border p-5 flex items-center gap-4', colors.bg)}>
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center ring-4', colors.ring, 'bg-card')}>
          <span className={cn('text-xl font-bold', colors.text)}>{data.riskScore}%</span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Churn Risk</p>
          <p className={cn('text-lg font-bold', colors.text)}>{data.riskLevel}</p>
        </div>
      </div>

      {/* Risk Factors */}
      {data.riskFactors.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Risk Factors</h3>
          <div className="space-y-2">
            {data.riskFactors.map((f, i) => {
              const isDown = f.direction === 'DOWN';
              return (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                  {isDown ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : f.impact === 'HIGH' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{f.factor}</span>
                  <span className={cn('ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded',
                    f.impact === 'HIGH' ? 'bg-red-100 text-red-700' :
                    f.impact === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700',
                  )}>{f.impact}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {data.recommendedActions.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Recommended Actions</h3>
          <div className="space-y-2">
            {data.recommendedActions.map((a, i) => {
              const Icon = ACTION_ICONS[a.action] ?? Phone;
              return (
                <button key={i} onClick={() => navigate(`/cases/new?customerId=${customerId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
