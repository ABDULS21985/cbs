import { FileBarChart } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskAppetiteGauges } from '../components/dashboard/RiskAppetiteGauges';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { KeyRiskIndicators } from '../components/dashboard/KeyRiskIndicators';
import { RiskAlertsList } from '../components/dashboard/RiskAlertsList';
import { RiskLimitsSummaryTable } from '../components/dashboard/RiskLimitsSummaryTable';
import {
  useRiskAppetite,
  useRiskHeatmap,
  useKris,
  useRiskAlerts,
  useRiskLimits,
} from '../hooks/useRiskDashboard';

export function RiskDashboardPage() {
  const appetite = useRiskAppetite();
  const heatmap = useRiskHeatmap();
  const kris = useKris();
  const alerts = useRiskAlerts();
  const limits = useRiskLimits();

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Enterprise Risk Dashboard"
        subtitle="Consolidated view of enterprise risk appetite, indicators, and limits"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <FileBarChart className="w-4 h-4" />
            Generate Risk Report
          </button>
        }
      />

      <div className="px-6 space-y-6">
        {/* Row 1: Risk Appetite Gauges */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Risk Appetite
          </h2>
          <RiskAppetiteGauges data={appetite.data ?? []} isLoading={appetite.isLoading} />
        </section>

        {/* Row 2: Risk Heatmap */}
        <section>
          <RiskHeatmap data={heatmap.data ?? []} isLoading={heatmap.isLoading} />
        </section>

        {/* Row 3: KRIs + Alerts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyRiskIndicators data={kris.data ?? []} isLoading={kris.isLoading} />
          <RiskAlertsList data={alerts.data ?? []} isLoading={alerts.isLoading} />
        </section>

        {/* Row 4: Risk Limits Summary */}
        <section>
          <RiskLimitsSummaryTable data={limits.data ?? []} isLoading={limits.isLoading} />
        </section>
      </div>
    </div>
  );
}
