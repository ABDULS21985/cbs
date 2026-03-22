import { useMemo, useState } from 'react';
import { AlertTriangle, Search, Settings, BarChart2, FileText, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, EmptyState } from '@/components/shared';
import { useFraudStats, useFraudTrend, useFraudAlerts, useFraudRules } from '../hooks/useFraud';
import { useCreateFraudRule } from '../hooks/useRiskExt';
import { FraudStatsCards } from '../components/fraud/FraudStatsCards';
import { FraudTrendChart } from '../components/fraud/FraudTrendChart';
import { AlertTriageQueue } from '../components/fraud/AlertTriageQueue';
import { FraudInvestigationView } from '../components/fraud/FraudInvestigationView';
import { FraudRuleTable } from '../components/fraud/FraudRuleTable';
import { ModelPerformancePanel } from '../components/fraud/ModelPerformancePanel';
import type { FraudAlertSeverity } from '../types/fraud';

// ─── Constants ───────────────────────────────────────────────────────────────

const RULE_CATEGORIES = [
  'TRANSACTION_AMOUNT',
  'VELOCITY',
  'GEOGRAPHIC',
  'BEHAVIORAL',
  'DEVICE',
  'ACCOUNT_TAKEOVER',
] as const;

const SEVERITY_OPTIONS: FraudAlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// ─── Create Fraud Rule Modal ─────────────────────────────────────────────────

function CreateFraudRuleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateFraudRule();
  const [form, setForm] = useState({
    ruleName: '',
    description: '',
    category: RULE_CATEGORIES[0] as string,
    severity: 'MEDIUM' as FraudAlertSeverity,
    scoreWeight: 50,
    applicableChannels: 'ALL',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form, {
      onSuccess: () => {
        toast.success('Fraud rule created successfully');
        setForm({
          ruleName: '',
          description: '',
          category: RULE_CATEGORIES[0],
          severity: 'MEDIUM',
          scoreWeight: 50,
          applicableChannels: 'ALL',
        });
        onClose();
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to create fraud rule');
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Create Fraud Rule</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rule Name</label>
            <input
              required
              value={form.ruleName}
              onChange={(e) => setForm({ ...form, ruleName: e.target.value })}
              placeholder="e.g. High-value international transfer"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe when this rule should trigger..."
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {RULE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as FraudAlertSeverity })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {SEVERITY_OPTIONS.map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Score Weight (1-100)</label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={form.scoreWeight}
                onChange={(e) => setForm({ ...form, scoreWeight: Number(e.target.value) })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Applicable Channels</label>
              <input
                value={form.applicableChannels}
                onChange={(e) => setForm({ ...form, applicableChannels: e.target.value })}
                placeholder="ALL"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function pct(count: number, total: number) {
  return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
}

export function FraudManagementPage() {
  const { isAdmin } = useAuth();
  const [investigatingAlertId, setInvestigatingAlertId] = useState<number | null>(null);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useFraudStats();
  const { data: trendData, isLoading: trendLoading } = useFraudTrend(30);
  const { data: alertsData, isLoading: alertsLoading } = useFraudAlerts({ page: 0, size: 100 });
  const { data: rules, isLoading: rulesLoading } = useFraudRules();

  const allAlerts = alertsData?.items ?? [];
  const alerts = useMemo(
    () => allAlerts.filter((alert) => alert.status === 'NEW' || alert.status === 'INVESTIGATING'),
    [allAlerts],
  );
  const severityBreakdown = useMemo(() => {
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
    return order.map((severity) => ({
      severity,
      count: allAlerts.filter((alert) => alert.severity === severity).length,
    }));
  }, [allAlerts]);
  const channelBreakdown = useMemo(
    () =>
      Object.entries(
        allAlerts.reduce<Record<string, number>>((acc, alert) => {
          const key = alert.channel ?? 'Unspecified';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((left, right) => right[1] - left[1]).slice(0, 5),
    [allAlerts],
  );
  const triggeredRules = useMemo(
    () =>
      Object.entries(
        allAlerts.reduce<Record<string, number>>((acc, alert) => {
          for (const rule of alert.rules) {
            acc[rule] = (acc[rule] ?? 0) + 1;
          }
          return acc;
        }, {}),
      ).sort((left, right) => right[1] - left[1]).slice(0, 6),
    [allAlerts],
  );
  const highestRiskAlerts = useMemo(
    () => [...allAlerts].sort((left, right) => right.score - left.score).slice(0, 5),
    [allAlerts],
  );

  const handleInvestigate = (alertId: number) => {
    setInvestigatingAlertId(alertId);
    toast.success(`Alert #${alertId} opened for investigation`);
  };

  const tabs = [
    {
      id: 'alert-triage',
      label: 'Alert Triage',
      icon: AlertTriangle,
      badge: alerts.length,
      content: (
        <div className="p-6">
          <AlertTriageQueue
            alerts={alerts}
            isLoading={alertsLoading}
            onInvestigate={handleInvestigate}
          />
        </div>
      ),
    },
    {
      id: 'active-cases',
      label: 'Active Cases',
      icon: Search,
      content: (
        <div className="p-6">
          {investigatingAlertId !== null ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Investigation View</h3>
                <button
                  onClick={() => setInvestigatingAlertId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back to triage
                </button>
              </div>
              <FraudInvestigationView alertId={investigatingAlertId} />
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="Select an alert to open investigation"
              description="Go to Alert Triage, select an alert, and click Investigate to open the investigation view here."
            />
          )}
        </div>
      ),
    },
    {
      id: 'rules-models',
      label: 'Rules & Models',
      icon: Settings,
      content: (
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Fraud Detection Rules</h3>
              {isAdmin && (
                <button
                  onClick={() => setCreateRuleOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Create Rule
                </button>
              )}
            </div>
            <FraudRuleTable rules={rules ?? []} isLoading={rulesLoading} />
          </div>
          <ModelPerformancePanel />
          <CreateFraudRuleModal open={createRuleOpen} onClose={() => setCreateRuleOpen(false)} />
        </div>
      ),
    },
    {
      id: 'patterns',
      label: 'Patterns',
      icon: BarChart2,
      content: (
        <div className="p-6">
          {alertsLoading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-48 rounded-lg border bg-card animate-pulse" />
              ))}
            </div>
          ) : allAlerts.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No fraud alert patterns yet"
              description="The backend has not returned any fraud alerts to aggregate for pattern analysis."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Severity Mix</h3>
                <div className="space-y-2">
                  {severityBreakdown.map((item) => (
                    <div key={item.severity} className="flex items-center justify-between text-sm">
                      <span>{item.severity}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({pct(item.count, allAlerts.length)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Channel Hotspots</h3>
                <div className="space-y-2">
                  {channelBreakdown.map(([channel, count]) => (
                    <div key={channel} className="flex items-center justify-between text-sm">
                      <span>{channel}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Most Triggered Rules</h3>
                <div className="space-y-2">
                  {triggeredRules.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No rule triggers were attached to the returned alerts.</div>
                  ) : (
                    triggeredRules.map(([rule, count]) => (
                      <div key={rule} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{rule}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      content: (
        <div className="p-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Total Alerts</div>
              <div className="mt-1 text-2xl font-bold">{stats?.totalAlerts ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Open Backlog</div>
              <div className="mt-1 text-2xl font-bold">{alerts.length}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Resolved Alerts</div>
              <div className="mt-1 text-2xl font-bold">{stats?.resolvedAlerts ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Active Rules</div>
              <div className="mt-1 text-2xl font-bold">{rules?.filter((rule) => rule.active).length ?? 0}</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Highest-Risk Alerts</h3>
              {highestRiskAlerts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No alerts were returned for this reporting snapshot.</div>
              ) : (
                <div className="space-y-3">
                  {highestRiskAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-medium text-sm">{alert.alertNumber}</div>
                        <div className="text-sm text-muted-foreground">{alert.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{alert.score}/100</div>
                        <div className="text-xs text-muted-foreground">{alert.status.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Rule Coverage Snapshot</h3>
              {triggeredRules.length === 0 ? (
                <div className="text-sm text-muted-foreground">No triggered rules were returned with the current alert sample.</div>
              ) : (
                <div className="space-y-3">
                  {triggeredRules.map(([rule, count]) => (
                    <div key={rule} className="flex items-center justify-between gap-3">
                      <span className="text-sm truncate">{rule}</span>
                      <span className="text-sm text-muted-foreground">{count} alerts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Fraud Management"
        subtitle="Real-time fraud detection, alert triage, and investigation"
      />

      <FraudStatsCards stats={stats} isLoading={statsLoading} />

      <div className="mb-4">
        <FraudTrendChart data={trendData ?? []} isLoading={trendLoading} />
      </div>

      <TabsPage tabs={tabs} syncWithUrl />
    </div>
  );
}
