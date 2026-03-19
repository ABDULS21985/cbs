import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReturnCalendar } from '../components/returns/ReturnCalendar';
import { ReturnTable } from '../components/returns/ReturnTable';
import { regulatoryApi } from '../api/regulatoryApi';

export function RegulatoryReturnsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'calendar' | 'all' | 'pending' | 'history'>('calendar');
  const [month] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: stats } = useQuery({ queryKey: ['reg-returns', 'stats'], queryFn: () => regulatoryApi.getStats() });
  const { data: calendar = [] } = useQuery({ queryKey: ['reg-returns', 'calendar', month], queryFn: () => regulatoryApi.getCalendar(month) });
  const { data: allReturns = [], isLoading } = useQuery({ queryKey: ['reg-returns', 'all'], queryFn: () => regulatoryApi.getAll() });

  const pendingReturns = allReturns.filter((r) => !['SUBMITTED', 'ACKNOWLEDGED'].includes(r.status));
  const historyReturns = allReturns.filter((r) => ['SUBMITTED', 'ACKNOWLEDGED'].includes(r.status));

  const statCards = stats ? [
    { label: 'Due This Month', value: String(stats.dueThisMonth) },
    { label: 'Pending Submission', value: String(stats.pendingSubmission) },
    { label: 'Overdue', value: String(stats.overdue), warn: stats.overdue > 0 },
    { label: 'Submitted MTD', value: String(stats.submittedMtd) },
  ] : [];

  const tabs = [
    { key: 'calendar' as const, label: 'Calendar' },
    { key: 'all' as const, label: 'All Returns' },
    { key: 'pending' as const, label: 'Pending' },
    { key: 'history' as const, label: 'History' },
  ];

  return (
    <>
      <PageHeader title="Regulatory Returns" subtitle="Return calendar, generation, validation, and submission" />
      <div className="page-container space-y-6">
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.warn ? 'text-red-600' : ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'calendar' && <ReturnCalendar data={calendar} />}
        {tab === 'all' && <ReturnTable data={allReturns} isLoading={isLoading} onRowClick={(r) => navigate(`/compliance/returns/${r.id}`)} />}
        {tab === 'pending' && <ReturnTable data={pendingReturns} isLoading={isLoading} onRowClick={(r) => navigate(`/compliance/returns/${r.id}`)} />}
        {tab === 'history' && <ReturnTable data={historyReturns} isLoading={isLoading} />}
      </div>
    </>
  );
}
