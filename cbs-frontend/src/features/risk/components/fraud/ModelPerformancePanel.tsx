import { useMemo } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Target, TrendingDown } from 'lucide-react';
import { formatPercent } from '@/lib/formatters';
import { useFraudAlerts, useModelPerformance } from '../../hooks/useFraud';
import { ScoreDistributionChart } from './ScoreDistributionChart';

function buildDistribution(alerts: Array<{ score: number; status: string }>) {
  const buckets = Array.from({ length: 10 }, (_, index) => {
    const start = index * 10;
    const end = start + 10;
    return {
      bucket: `${start}-${end}`,
      open: 0,
      resolved: 0,
    };
  });

  for (const alert of alerts) {
    const index = Math.min(Math.floor(Math.max(alert.score, 0) / 10), 9);
    if (alert.status === 'NEW' || alert.status === 'INVESTIGATING') {
      buckets[index].open += 1;
    } else {
      buckets[index].resolved += 1;
    }
  }

  return buckets;
}

export function ModelPerformancePanel() {
  const { data: model, isLoading } = useModelPerformance();
  const { data: alertsData } = useFraudAlerts({ page: 0, size: 100 });
  const scoreDistribution = useMemo(
    () => buildDistribution((alertsData?.items ?? []).map((alert) => ({ score: alert.score, status: alert.status }))),
    [alertsData?.items],
  );

  if (isLoading) {
    return (
      <div className="surface-card p-6 animate-pulse space-y-4">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!model) return null;

  return (
    <div className="surface-card p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">Fraud Detection Performance</h3>
          <div className="text-xs text-muted-foreground mt-0.5">
            Read-only snapshot based on the live fraud alert backlog and closed-case outcomes.
          </div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Model lifecycle operations are controlled outside this console.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Total Alerts
          </div>
          <div className="text-xl font-bold mt-1">{model.totalAlerts.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Resolved
          </div>
          <div className="text-xl font-bold mt-1">{model.resolvedAlerts.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5" />
            False Positives
          </div>
          <div className="text-xl font-bold mt-1">{model.falsePositives.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Target className="w-3.5 h-3.5" />
            Detection Rate
          </div>
          <div className="text-xl font-bold mt-1">{formatPercent(model.detectionRate)}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="w-3.5 h-3.5" />
            False Positive Rate
          </div>
          <div className="text-xl font-bold mt-1">{formatPercent(model.falsePositiveRate)}</div>
        </div>
      </div>

      <ScoreDistributionChart data={scoreDistribution} />
    </div>
  );
}
