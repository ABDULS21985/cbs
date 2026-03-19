import { useState } from 'react';
import { Shield, Clock, AlertOctagon, CheckCircle2, Database, Play } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import {
  useSanctionsStats,
  usePendingMatches,
  useSanctionsMatch,
  useWatchlists,
} from '../hooks/useSanctions';
import { SanctionsStatsCards } from '../components/sanctions/SanctionsStatsCards';
import { PendingMatchTable } from '../components/sanctions/PendingMatchTable';
import { FalsePositiveLog } from '../components/sanctions/FalsePositiveLog';
import { WatchlistManagementTable } from '../components/sanctions/WatchlistManagementTable';
import { BatchScreeningPanel } from '../components/sanctions/BatchScreeningPanel';
import { MatchReviewPanel } from '../components/sanctions/MatchReviewPanel';
import type { SanctionsMatch } from '../types/sanctions';

export function SanctionsScreeningPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useSanctionsStats();
  const { data: pendingData, isLoading: pendingLoading } = usePendingMatches({ status: 'PENDING' });
  const { data: confirmedData, isLoading: confirmedLoading } = usePendingMatches({ status: 'CONFIRMED_HIT' });
  const { data: fpData, isLoading: fpLoading } = usePendingMatches({ status: 'FALSE_POSITIVE' });
  const { data: selectedMatch } = useSanctionsMatch(selectedMatchId);
  const { data: watchlists, isLoading: watchlistsLoading } = useWatchlists();

  const pendingMatches = pendingData?.items ?? [];
  const confirmedMatches = confirmedData?.items ?? [];
  const falsePositives = fpData?.items ?? [];

  const handleRowClick = (match: SanctionsMatch) => {
    setSelectedMatchId(match.id);
  };

  const tabs = [
    {
      id: 'pending-review',
      label: 'Pending Review',
      icon: Clock,
      badge: pendingMatches.length,
      content: (
        <div className="p-6">
          <PendingMatchTable
            data={pendingMatches}
            isLoading={pendingLoading}
            onRowClick={handleRowClick}
          />
        </div>
      ),
    },
    {
      id: 'confirmed-hits',
      label: 'Confirmed Hits',
      icon: AlertOctagon,
      badge: confirmedMatches.length,
      content: (
        <div className="p-6">
          <PendingMatchTable
            data={confirmedMatches}
            isLoading={confirmedLoading}
            onRowClick={handleRowClick}
          />
        </div>
      ),
    },
    {
      id: 'false-positives',
      label: 'False Positives',
      icon: CheckCircle2,
      content: (
        <div className="p-6">
          <FalsePositiveLog data={falsePositives} isLoading={fpLoading} />
        </div>
      ),
    },
    {
      id: 'watchlists',
      label: 'Watchlists',
      icon: Database,
      content: (
        <div className="p-6">
          <WatchlistManagementTable
            watchlists={watchlists ?? []}
            isLoading={watchlistsLoading}
          />
        </div>
      ),
    },
    {
      id: 'batch-screening',
      label: 'Batch Screening',
      icon: Play,
      content: (
        <BatchScreeningPanel onMatchClick={handleRowClick} />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Sanctions Screening"
        subtitle="Monitor and review sanctions watchlist matches"
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5" />
            Live Screening Active
          </div>
        }
      />

      <SanctionsStatsCards stats={stats} isLoading={statsLoading} />

      <TabsPage tabs={tabs} syncWithUrl />

      {/* Match review overlay */}
      {selectedMatchId !== null && selectedMatch && (
        <MatchReviewPanel
          match={selectedMatch}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  );
}
