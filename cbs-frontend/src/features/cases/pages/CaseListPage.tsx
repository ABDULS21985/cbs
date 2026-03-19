import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CaseTable } from '../components/CaseTable';
import { caseApi } from '../api/caseApi';
import { useCaseStats, useMyCases, useUnassignedCases } from '../hooks/useCases';

export function CaseListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my' | 'unassigned' | 'escalated' | 'all'>('my');

  const { data: stats } = useCaseStats();
  const { data: myCases = [], isLoading: myLoading } = useMyCases();
  const { data: unassigned = [], isLoading: unassignedLoading } = useUnassignedCases();
  const { data: allCases = [], isLoading: allLoading } = useQuery({
    queryKey: ['cases', 'list'],
    queryFn: () => caseApi.getAll(),
  });

  const escalated = allCases.filter((c) => c.status === 'ESCALATED');

  const tabs = [
    { key: 'my' as const, label: 'My Cases', data: myCases, loading: myLoading },
    { key: 'unassigned' as const, label: 'Unassigned', data: unassigned, loading: unassignedLoading },
    { key: 'escalated' as const, label: 'Escalated', data: escalated, loading: allLoading },
    { key: 'all' as const, label: 'All Cases', data: allCases, loading: allLoading },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  const statCards = [
    { label: 'Open Cases', value: stats?.openCases ?? '—' },
    { label: 'SLA Breached', value: stats?.slaBreached ?? '—' },
    { label: 'Resolved Today', value: stats?.resolvedToday ?? '—' },
    { label: 'Avg Resolution', value: stats ? `${stats.avgResolutionHours.toFixed(1)}h` : '—' },
  ];

  return (
    <>
      <PageHeader
        title="Case Management"
        subtitle="Create, track and resolve customer cases"
        actions={
          <button onClick={() => navigate('/cases/new')} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Case
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label} {tab.data.length > 0 && <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.data.length}</span>}
            </button>
          ))}
        </div>

        <CaseTable
          data={currentTab.data}
          isLoading={currentTab.loading}
          onRowClick={(row) => navigate(`/cases/${row.id}`)}
        />
      </div>
    </>
  );
}
