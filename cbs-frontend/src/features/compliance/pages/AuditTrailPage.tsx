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
  const { data: summary } = useAuditSummary(searched);

  const { data: heatmapData } = useQuery({
    queryKey: ['audit', 'heatmap', userView],
    queryFn: () => auditApi.getUserHeatmap(userView!),
    enabled: !!userView,
  });

  const handleSearch = (p: AuditSearchParams) => {
    setParams(p);
    setSearched(true);
    setUserView(p.performedBy || null);
  };

  const summaryItems = summary ? [
    { label: 'Total Events', value: summary.totalEvents.toLocaleString() },
    { label: 'Creates', value: (summary.byAction?.CREATE ?? 0).toLocaleString() },
    { label: 'Updates', value: (summary.byAction?.UPDATE ?? 0).toLocaleString() },
    { label: 'Deletes', value: (summary.byAction?.DELETE ?? 0).toLocaleString() },
    { label: 'Approvals', value: (summary.byAction?.APPROVE ?? 0).toLocaleString() },
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

        {userView && heatmapData && (
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
