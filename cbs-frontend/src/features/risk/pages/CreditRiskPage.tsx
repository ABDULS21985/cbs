import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { useCreditRiskStats, useRatingDistribution, useNplTrend } from '../hooks/useCreditRisk';
import { CreditRiskStatsCards } from '../components/creditrisk/CreditRiskStatsCards';
import { RatingDistributionChart } from '../components/creditrisk/RatingDistributionChart';
import { NplTrendChart } from '../components/creditrisk/NplTrendChart';
import { ConcentrationAnalysis } from '../components/creditrisk/ConcentrationAnalysis';
import { RatingMigrationMatrix } from '../components/creditrisk/RatingMigrationMatrix';
import { SingleObligorTable } from '../components/creditrisk/SingleObligorTable';
import { ScorecardViewer } from '../components/creditrisk/ScorecardViewer';
import { WatchListTable } from '../components/creditrisk/WatchListTable';
import { CreditCommitteePackGenerator } from '../components/creditrisk/CreditCommitteePackGenerator';

function RatingMigrationSection() {
  return (
    <div className="space-y-4 p-4">
      <RatingMigrationMatrix />
      <SingleObligorTable />
    </div>
  );
}

function CreditCommitteeSection() {
  return (
    <div className="p-4">
      <div className="max-w-lg">
        <CreditCommitteePackGenerator />
      </div>
    </div>
  );
}

export function CreditRiskPage() {
  const { data: stats, isLoading } = useCreditRiskStats();
  const { data: distribution } = useRatingDistribution();
  const { data: nplTrend } = useNplTrend();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Risk"
        subtitle="Portfolio quality and credit risk monitoring"
      />

      {/* Row 1: Stats */}
      <CreditRiskStatsCards stats={stats} isLoading={isLoading} />

      {/* Row 2: Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Rating Distribution</h3>
          <RatingDistributionChart data={distribution ?? []} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">NPL Trend</h3>
          <NplTrendChart data={nplTrend ?? []} />
        </div>
      </div>

      {/* Tabs */}
      <TabsPage
        syncWithUrl
        tabs={[
          { id: 'portfolio', label: 'Portfolio Quality', content: <ConcentrationAnalysis /> },
          { id: 'migration', label: 'Rating Migration', content: <RatingMigrationSection /> },
          { id: 'scorecards', label: 'Scorecards', content: <ScorecardViewer /> },
          { id: 'watchlist', label: 'Watch List', content: <WatchListTable /> },
          { id: 'committee', label: 'Credit Committee', content: <CreditCommitteeSection /> },
        ]}
      />
    </div>
  );
}
