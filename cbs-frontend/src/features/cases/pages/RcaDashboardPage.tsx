import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { rootCauseAnalysisApi } from '../api/rootCauseApi';
import type { RecurringRootCause, CasePatternInsight } from '../types/rootCause';
import { formatDateTime } from '@/lib/formatters';

function TrendIcon({ trend }: { trend: RecurringRootCause['trend'] }) {
  if (trend === 'INCREASING') return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === 'DECREASING') return <TrendingDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function PatternPriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[priority] ?? map['LOW']}`}>
      {priority}
    </span>
  );
}

export function RcaDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [patternFrom, setPatternFrom] = useState('');
  const [patternTo, setPatternTo] = useState('');
  const [recurringFrom, setRecurringFrom] = useState('');
  const [recurringTo, setRecurringTo] = useState('');

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['cases', 'rca', 'dashboard'],
    queryFn: () => rootCauseAnalysisApi.dashboard(),
    staleTime: 60_000,
  });

  const { data: recurring = [], isLoading: recurringLoading, refetch: refetchRecurring } = useQuery({
    queryKey: ['cases', 'rca', 'recurring', recurringFrom, recurringTo],
    queryFn: () => rootCauseAnalysisApi.recurring({
      ...(recurringFrom ? { from: recurringFrom } : {}),
      ...(recurringTo ? { to: recurringTo } : {}),
    }),
    staleTime: 60_000,
  });

  const generateMutation = useMutation({
    mutationFn: () => rootCauseAnalysisApi.generatePatterns({
      ...(patternFrom ? { from: patternFrom } : {}),
      ...(patternTo ? { to: patternTo } : {}),
    }),
    onSuccess: () => {
      toast.success('Pattern insights generated');
      queryClient.invalidateQueries({ queryKey: ['cases', 'rca'] });
    },
    onError: () => toast.error('Failed to generate patterns'),
  });

  const patterns: CasePatternInsight[] = generateMutation.data ?? [];

  const kpis = dashboard
    ? [
        { label: 'Total Analyses', value: dashboard.totalAnalyses, icon: BarChart2 },
        { label: 'Pending', value: dashboard.pendingAnalyses, icon: Clock },
        { label: 'Completed', value: dashboard.completedAnalyses, icon: CheckCircle2, positive: true },
        { label: 'Validated', value: dashboard.validatedAnalyses, icon: CheckCircle2, positive: true },
        { label: 'Cases with RCA', value: dashboard.totalCasesWithRca, icon: Users },
        { label: 'Financial Impact', value: `₦${(dashboard.financialImpactTotal ?? 0).toLocaleString()}`, icon: AlertTriangle },
        { label: 'Avg Days to Close', value: `${(dashboard.avgDaysToComplete ?? 0).toFixed(1)}d`, icon: Clock },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="RCA Dashboard"
        subtitle="Root Cause Analysis patterns, recurring causes, and analytics"
        actions={
          <button
            onClick={() => navigate('/cases')}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted"
          >
            ← Case Management
          </button>
        }
      />
      <div className="page-container space-y-8">

        {/* KPI Cards */}
        {dashLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <p className={`text-xl font-semibold font-mono ${kpi.positive ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {kpi.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* By Category Breakdown */}
        {dashboard?.byCategory && Object.keys(dashboard.byCategory).length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Root Causes by Category</h3>
            <div className="space-y-3">
              {Object.entries(dashboard.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => {
                  const total = Object.values(dashboard.byCategory).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="w-28 text-xs font-medium text-muted-foreground truncate">{category.replace(/_/g, ' ')}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-14 text-right text-xs text-muted-foreground">{count} ({pct}%)</div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recurring Root Causes */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-sm font-semibold">Recurring Root Causes</h3>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={recurringFrom}
                onChange={(e) => setRecurringFrom(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-xs"
                placeholder="From"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="date"
                value={recurringTo}
                onChange={(e) => setRecurringTo(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-xs"
                placeholder="To"
              />
              <button
                onClick={() => refetchRecurring()}
                className="p-1.5 border rounded-md hover:bg-muted"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {recurringLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse h-10 bg-muted rounded-lg" />)}
            </div>
          ) : recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recurring root causes found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Sub-Category</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Occurrences</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Cases</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Trend</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Last Seen</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Avg Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recurring.map((rc, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{rc.category.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-3 text-muted-foreground">{rc.subCategory ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-mono">{rc.occurrenceCount}</td>
                      <td className="py-2 px-3 text-right font-mono">{rc.affectedCases}</td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center">
                          <TrendIcon trend={rc.trend} />
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{formatDateTime(rc.lastSeen)}</td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">{rc.avgResolutionDays?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pattern Insights */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-sm font-semibold">Pattern Insights</h3>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={patternFrom}
                onChange={(e) => setPatternFrom(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <input
                type="date"
                value={patternTo}
                onChange={(e) => setPatternTo(e.target.value)}
                className="px-3 py-1.5 border rounded-md text-xs"
              />
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                {generateMutation.isPending ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>

          {patterns.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Click "Generate" to analyse case patterns for the selected date range.
            </p>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div key={pattern.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{pattern.patternType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pattern.patternDescription}</p>
                    </div>
                    <PatternPriorityBadge priority={pattern.priority} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t text-xs text-muted-foreground">
                    <span>Cases: <strong className="text-foreground font-mono">{pattern.caseCount}</strong></span>
                    <span>Category: <strong className="text-foreground">{pattern.rootCauseCategory}</strong></span>
                    <span>Trend: <strong className="text-foreground">{pattern.trendDirection}</strong></span>
                    <span>Status: <strong className="text-foreground">{pattern.status}</strong></span>
                  </div>
                  {pattern.recommendedAction && (
                    <div className="flex items-start gap-2 p-2 bg-muted/40 rounded text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{pattern.recommendedAction}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
