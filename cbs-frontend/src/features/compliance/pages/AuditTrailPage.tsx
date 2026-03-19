import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SummaryBar } from '@/components/shared/SummaryBar';
import { AuditSearchForm } from '../components/audit/AuditSearchForm';
import { AuditResultsTable } from '../components/audit/AuditResultsTable';
import { AuditDetailPanel } from '../components/audit/AuditDetailPanel';
import { UserActivityHeatmap } from '../components/audit/UserActivityHeatmap';
import { useAuditSearch, useAuditSummary } from '../hooks/useAuditSearch';
import { auditApi, type AuditSearchParams, type AuditEntry } from '../api/auditApi';
import { useQuery } from '@tanstack/react-query';

export function AuditTrailPage() {
  const [params, setParams] = useState<AuditSearchParams>({});
  const [searched, setSearched] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [userView, setUserView] = useState<string | null>(null);

  const { data: results = [], isLoading } = useAuditSearch(params, searched);
  const { data: summary } = useAuditSummary(params, searched);

  const { data: heatmapData = [] } = useQuery({
    queryKey: ['audit', 'heatmap', userView],
    queryFn: () => auditApi.getUserHeatmap(userView!, 30),
    enabled: !!userView,
  });

  const handleSearch = (p: AuditSearchParams) => {
    setParams(p);
    setSearched(true);
    setUserView(p.userId || null);
  };

  const summaryItems = summary ? [
    { label: 'Results', value: summary.totalResults.toLocaleString() },
    { label: 'Creates', value: summary.creates.toLocaleString() },
    { label: 'Updates', value: summary.updates.toLocaleString() },
    { label: 'Deletes', value: summary.deletes.toLocaleString() },
    { label: 'Approvals', value: summary.approvals.toLocaleString() },
  ] : [];

  return (
    <>
      <PageHeader title="Audit Trail" subtitle="Search and investigate system activity" />
      <div className="page-container space-y-6">
        <AuditSearchForm onSearch={handleSearch} />

        {searched && summary && (
          <SummaryBar items={summaryItems} />
        )}

        {searched && (
          <AuditResultsTable data={results} isLoading={isLoading} onRowClick={setSelectedEntry} />
        )}

        {userView && heatmapData.length > 0 && (
          <UserActivityHeatmap data={heatmapData} />
        )}

        {selectedEntry && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedEntry(null)} />
            <AuditDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
          </>
        )}
      </div>
    </>
  );
}
