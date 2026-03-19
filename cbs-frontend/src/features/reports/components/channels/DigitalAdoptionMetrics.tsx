import { TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DigitalAdoption } from '../../api/channelAnalyticsApi';
import { AdoptionFunnelChart } from './AdoptionFunnelChart';

interface DigitalAdoptionMetricsProps {
  data: DigitalAdoption | undefined;
  isLoading?: boolean;
}

export function DigitalAdoptionMetrics({ data, isLoading }: DigitalAdoptionMetricsProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground">Digital Adoption Metrics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          User engagement and feature utilisation across digital channels
        </p>
      </div>

      {/* Top row: two KPI cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Registered Users</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{data.registeredUsers.toLocaleString()}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>+{data.registeredGrowthPct}% vs last month</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Active Users (30-day)</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{data.activeUsers30d.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{data.activePctOfTotal.toFixed(1)}%</span>
            {' '}of registered users
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Adoption */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Feature Adoption
          </h3>
          <div className="space-y-3">
            {data.featureAdoption.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{f.feature}</span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {f.pct}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      f.pct >= 75 ? 'bg-green-500' :
                      f.pct >= 50 ? 'bg-blue-500' :
                      f.pct >= 30 ? 'bg-amber-500' : 'bg-slate-400',
                    )}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Adoption Funnel */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Onboarding Funnel
          </h3>
          <AdoptionFunnelChart funnel={data.funnel} />
        </div>
      </div>
    </div>
  );
}
