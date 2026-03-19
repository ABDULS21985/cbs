import { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { EclStatsCards } from '../components/ecl/EclStatsCards';
import { StageDistributionChart } from '../components/ecl/StageDistributionChart';
import { StageMigrationChart } from '../components/ecl/StageMigrationChart';
import { ProvisionMovementTable } from '../components/ecl/ProvisionMovementTable';
import { PdTermStructureTable } from '../components/ecl/PdTermStructureTable';
import { LgdByCollateralTable } from '../components/ecl/LgdByCollateralTable';
import { GlReconciliationCard } from '../components/ecl/GlReconciliationCard';
import { MacroScenarioPanel } from '../components/ecl/MacroScenarioPanel';
import { EclDrilldownTable } from '../components/ecl/EclDrilldownTable';
import {
  useEclSummary,
  useStageDistribution,
  useStageMigration,
  useProvisionMovement,
  usePdTermStructure,
  useLgdByCollateral,
  useEadByProduct,
  useGlReconciliation,
  useMacroScenarios,
  useLoansByStage,
  useRunEclCalculation,
} from '../hooks/useEclDashboard';

export default function EclDashboardPage() {
  const [selectedStage, setSelectedStage] = useState<1 | 2 | 3 | null>(null);

  const { data: summary, isLoading: summaryLoading } = useEclSummary();
  const { data: distribution } = useStageDistribution();
  const { data: migration } = useStageMigration();
  const { data: movement } = useProvisionMovement();
  const { data: pdData } = usePdTermStructure();
  const { data: lgdData } = useLgdByCollateral();
  const { data: eadData } = useEadByProduct();
  const { data: glData } = useGlReconciliation();
  const { data: scenarios } = useMacroScenarios();
  const { data: drilldownData, isLoading: drillLoading } = useLoansByStage(
    selectedStage ?? 1,
    !!selectedStage
  );
  const runCalc = useRunEclCalculation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ECL & Provisioning"
        subtitle="IFRS 9 Expected Credit Loss monitoring"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => runCalc.mutate()}
              disabled={runCalc.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {runCalc.isPending ? 'Running...' : 'Run ECL Calculation'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        }
      />

      {/* Row 1: Stats */}
      <EclStatsCards summary={summary} isLoading={summaryLoading} />

      {/* Row 2: Stage Distribution + Migration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-1">Stage Distribution</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Click a stage to drill down
          </p>
          <StageDistributionChart
            data={distribution ?? []}
            onStageClick={(stage) =>
              setSelectedStage(stage === selectedStage ? null : stage)
            }
            selectedStage={selectedStage}
          />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">
            Stage Migration — This Month
          </h3>
          <StageMigrationChart data={migration ?? []} />
        </div>
      </div>

      {/* Drilldown */}
      {selectedStage && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Stage {selectedStage} Loans
            </h3>
            <button
              onClick={() => setSelectedStage(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close ×
            </button>
          </div>
          <EclDrilldownTable
            data={drilldownData?.items ?? []}
            isLoading={drillLoading}
          />
        </div>
      )}

      {/* Row 3: Provision Movement */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">Provision Movement</h3>
        <ProvisionMovementTable data={movement ?? []} />
      </div>

      {/* Row 4: Parameter Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">PD Term Structure</h3>
          <PdTermStructureTable data={pdData ?? []} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">LGD by Collateral Type</h3>
          <LgdByCollateralTable data={lgdData ?? []} />
        </div>
      </div>

      {/* EAD by Product */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">EAD by Product</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Product</th>
                <th className="text-right py-2 font-medium">Outstanding</th>
                <th className="text-right py-2 font-medium">Undrawn</th>
                <th className="text-right py-2 font-medium">CCF</th>
                <th className="text-right py-2 font-medium">EAD</th>
              </tr>
            </thead>
            <tbody>
              {(eadData ?? []).map((row) => (
                <tr key={row.product} className="border-b border-border/40">
                  <td className="py-2">{row.product}</td>
                  <td className="py-2 text-right font-mono">
                    {formatMoneyCompact(row.outstanding)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatMoneyCompact(row.undrawn)}
                  </td>
                  <td className="py-2 text-right">
                    {formatPercent(row.ccf)}
                  </td>
                  <td className="py-2 text-right font-mono font-medium">
                    {formatMoneyCompact(row.ead)}
                  </td>
                </tr>
              ))}
              {(eadData ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No EAD data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: GL Reconciliation */}
      {glData && <GlReconciliationCard data={glData} />}

      {/* Macro Scenario Panel */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">Macro Scenario Analysis</h3>
        <MacroScenarioPanel scenarios={scenarios ?? []} />
      </div>
    </div>
  );
}
