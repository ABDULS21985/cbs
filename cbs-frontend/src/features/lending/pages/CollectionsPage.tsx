import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, ListChecks, FileX, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable } from '@/components/shared';
import { formatPercent } from '@/lib/formatters';
import { useCollectionStats, useDpdAging, useCollectionCases, useDunningQueue, useWriteOffRequests, useRecovery } from '../hooks/useCollections';
import { CollectionStatsCards } from '../components/collections/CollectionStatsCards';
import { DpdAgingChart } from '../components/collections/DpdAgingChart';
import { CollectionCaseTable } from '../components/collections/CollectionCaseTable';
import { DunningTimeline } from '../components/collections/DunningTimeline';
import { DunningQueueTable } from '../components/collections/DunningQueueTable';
import { WriteOffRequestForm } from '../components/collections/WriteOffRequestForm';
import { RecoveryTrackingTable } from '../components/collections/RecoveryTrackingTable';
import type { WriteOffRequest } from '../types/collections';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatMoney } from '@/lib/formatters';

// Write-off requests table columns
const writeOffColumns: ColumnDef<WriteOffRequest>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstanding)}</span>,
  },
  {
    accessorKey: 'provisionHeld',
    header: 'Provision Held',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionHeld)}</span>,
  },
  {
    accessorKey: 'recoveryProbability',
    header: 'Recovery Prob.',
    cell: ({ row }) => <span>{formatPercent(row.original.recoveryProbability)}</span>,
  },
  {
    accessorKey: 'requestedBy',
    header: 'Requested By',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const color =
        row.original.status === 'APPROVED'
          ? 'bg-green-100 text-green-800'
          : row.original.status === 'REJECTED'
          ? 'bg-red-100 text-red-800'
          : 'bg-amber-100 text-amber-800';
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
          {row.original.status}
        </span>
      );
    },
  },
  {
    accessorKey: 'requestedAt',
    header: 'Requested',
    cell: ({ row }) => formatDate(row.original.requestedAt),
  },
];

// Collection efficiency gauge (donut)
function CollectionEfficiencyGauge({ efficiency = 68 }: { efficiency?: number }) {
  const data = [
    { name: 'Collected', value: efficiency },
    { name: 'Remaining', value: 100 - efficiency },
  ];
  return (
    <div className="bg-card border rounded-lg p-4 flex flex-col items-center justify-center h-full">
      <h3 className="text-sm font-semibold text-foreground mb-2">Collection Efficiency</h3>
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="#22c55e" />
              <Cell fill="#e5e7eb" />
            </Pie>
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold">{efficiency.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">MTD</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">Portion of delinquent balance collected</p>
    </div>
  );
}

export default function CollectionsPage() {
  const { data: stats, isLoading: statsLoading } = useCollectionStats();
  const { data: agingData } = useDpdAging();
  const { data: cases, isLoading: casesLoading } = useCollectionCases();
  const { data: dunningQueue, isLoading: dunningLoading } = useDunningQueue();
  const { data: writeOffRequests, isLoading: writeOffLoading } = useWriteOffRequests();
  const { data: recovery, isLoading: recoveryLoading } = useRecovery();

  // Calculate collection efficiency if stats available
  const efficiency =
    stats && stats.totalDelinquent > 0
      ? (stats.recoveredMtd / (stats.totalDelinquent + stats.recoveredMtd)) * 100
      : 68;

  const tabs = [
    {
      id: 'active-cases',
      label: 'Active Cases',
      icon: AlertCircle,
      badge: cases?.length,
      content: (
        <div className="p-6">
          <CollectionCaseTable data={cases} isLoading={casesLoading} />
        </div>
      ),
    },
    {
      id: 'dunning-queue',
      label: 'Dunning Queue',
      icon: ListChecks,
      badge: dunningQueue?.length,
      content: (
        <div className="p-6 space-y-6">
          <DunningTimeline />
          <DunningQueueTable data={dunningQueue} isLoading={dunningLoading} />
        </div>
      ),
    },
    {
      id: 'write-offs',
      label: 'Write-Offs',
      icon: FileX,
      content: (
        <div className="p-6 space-y-6">
          <WriteOffRequestForm />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Write-Off Requests</h3>
            <DataTable
              columns={writeOffColumns}
              data={writeOffRequests ?? []}
              isLoading={writeOffLoading}
              emptyMessage="No write-off requests found"
              pageSize={10}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'recovery',
      label: 'Recovery Tracking',
      icon: TrendingUp,
      content: (
        <div className="p-6">
          <RecoveryTrackingTable data={recovery} isLoading={recoveryLoading} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Collections & Recovery"
        subtitle="Monitor delinquent accounts, manage dunning workflows, and track recovery performance"
      />

      <div className="px-6">
        <CollectionStatsCards stats={stats} isLoading={statsLoading} />
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DpdAgingChart data={agingData} />
        </div>
        <div>
          <CollectionEfficiencyGauge efficiency={efficiency} />
        </div>
      </div>

      <div className="border rounded-lg mx-6 overflow-hidden bg-card">
        <TabsPage tabs={tabs} syncWithUrl />
      </div>
    </div>
  );
}
