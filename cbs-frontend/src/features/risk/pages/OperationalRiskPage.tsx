import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { LossEventTable } from '../components/oprisk/LossEventTable';
import { LossDistributionChart } from '../components/oprisk/LossDistributionChart';
import { KriCard } from '../components/oprisk/KriCard';
import { opriskApi, type RcsaAssessment, type Incident } from '../api/opriskApi';

const rcsaColumns: ColumnDef<RcsaAssessment, any>[] = [
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'risksIdentified', header: 'Risks' },
  { accessorKey: 'controlsAssessed', header: 'Controls' },
  { accessorKey: 'residualRiskRating', header: 'Residual Risk', cell: ({ row }) => <StatusBadge status={row.original.residualRiskRating} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const incidentColumns: ColumnDef<Incident, any>[] = [
  { accessorKey: 'incidentNumber', header: '#', cell: ({ row }) => <span className="font-mono text-xs">{row.original.incidentNumber}</span> },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <StatusBadge status={row.original.severity} /> },
  { accessorKey: 'impact', header: 'Impact' },
  { accessorKey: 'assignedTo', header: 'Assigned' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function OperationalRiskPage() {
  const [tab, setTab] = useState<'losses' | 'kri' | 'rcsa' | 'incidents'>('losses');

  const { data: stats } = useQuery({ queryKey: ['oprisk', 'stats'], queryFn: () => opriskApi.getStats() });
  const { data: lossEvents = [], isLoading } = useQuery({ queryKey: ['oprisk', 'losses'], queryFn: () => opriskApi.getLossEvents() });
  const { data: lossByCat = [] } = useQuery({ queryKey: ['oprisk', 'loss-by-cat'], queryFn: () => opriskApi.getLossByCategory() });
  const { data: kris = [] } = useQuery({ queryKey: ['oprisk', 'kris'], queryFn: () => opriskApi.getKris() });
  const { data: rcsaList = [] } = useQuery({ queryKey: ['oprisk', 'rcsa'], queryFn: () => opriskApi.getRcsaList() });
  const { data: incidents = [] } = useQuery({ queryKey: ['oprisk', 'incidents'], queryFn: () => opriskApi.getIncidents() });

  const statCards = stats ? [
    { label: 'Loss Events MTD', value: String(stats.lossEventsMtd) },
    { label: 'Total Loss', value: formatMoney(stats.totalLossMtd, stats.currency) },
    { label: 'Open Incidents', value: String(stats.openIncidents) },
    { label: 'KRIs Breached', value: String(stats.krisBreached) },
    { label: 'RCSA Due', value: String(stats.rcsaDue) },
  ] : [];

  const tabs = [
    { key: 'losses' as const, label: 'Loss Events' },
    { key: 'kri' as const, label: 'KRI Dashboard' },
    { key: 'rcsa' as const, label: 'RCSA' },
    { key: 'incidents' as const, label: 'Incidents' },
  ];

  return (
    <>
      <PageHeader title="Operational Risk" subtitle="Loss events, KRIs, RCSA, incident management" />
      <div className="page-container space-y-6">
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (<div key={s.label} className="stat-card"><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>))}
          </div>
        )}

        <LossDistributionChart data={lossByCat} currency={stats?.currency || 'NGN'} />

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'losses' && <LossEventTable data={lossEvents} isLoading={isLoading} />}
        {tab === 'kri' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kris.map((kri) => <KriCard key={kri.id} kri={kri} />)}
          </div>
        )}
        {tab === 'rcsa' && <DataTable columns={rcsaColumns} data={rcsaList} enableGlobalFilter emptyMessage="No RCSA assessments" />}
        {tab === 'incidents' && <DataTable columns={incidentColumns} data={incidents} enableGlobalFilter emptyMessage="No incidents" />}
      </div>
    </>
  );
}
