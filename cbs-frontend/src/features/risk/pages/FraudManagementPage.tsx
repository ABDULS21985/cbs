import { useState } from 'react';
import { AlertTriangle, Search, Settings, BarChart2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, EmptyState } from '@/components/shared';
import { useFraudStats, useFraudTrend, useFraudAlerts, useFraudRules } from '../hooks/useFraud';
import { FraudStatsCards } from '../components/fraud/FraudStatsCards';
import { FraudTrendChart } from '../components/fraud/FraudTrendChart';
import { AlertTriageQueue } from '../components/fraud/AlertTriageQueue';
import { FraudInvestigationView } from '../components/fraud/FraudInvestigationView';
import { FraudRuleTable } from '../components/fraud/FraudRuleTable';
import { ModelPerformancePanel } from '../components/fraud/ModelPerformancePanel';

export function FraudManagementPage() {
  const [investigatingAlertId, setInvestigatingAlertId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useFraudStats();
  const { data: trendData, isLoading: trendLoading } = useFraudTrend(30);
  const { data: alertsData, isLoading: alertsLoading } = useFraudAlerts({ status: 'OPEN' });
  const { data: rules, isLoading: rulesLoading } = useFraudRules();

  const alerts = alertsData?.items ?? [];

  const handleInvestigate = (alertId: number) => {
    setInvestigatingAlertId(alertId);
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
            <h3 className="text-sm font-semibold mb-3">Fraud Detection Rules</h3>
            <FraudRuleTable rules={rules ?? []} isLoading={rulesLoading} />
          </div>
          <ModelPerformancePanel />
        </div>
      ),
    },
    {
      id: 'patterns',
      label: 'Patterns',
      icon: BarChart2,
      content: (
        <div className="p-6">
          <EmptyState
            icon={BarChart2}
            title="Pattern analysis unavailable"
            description="This view is not wired to a backend fraud-pattern analytics feed in the current build."
          />
        </div>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      content: (
        <div className="p-6">
          <EmptyState
            icon={FileText}
            title="Fraud reports unavailable"
            description="This reporting view is not wired to backend fraud-report generation in the current build."
          />
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
