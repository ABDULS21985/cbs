import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Clock, Scale } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cardsApi } from '../api/cardExtApi';
import type { CardDispute } from '../types/cardExt';

const STATUS_OPTIONS = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED', 'CLOSED'] as const;

const columns: ColumnDef<CardDispute, unknown>[] = [
  {
    accessorKey: 'disputeRef',
    header: 'Dispute Ref',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'merchantName',
    header: 'Merchant',
    cell: ({ getValue }) => (
      <span className="text-sm">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    accessorKey: 'disputeReason',
    header: 'Reason',
    cell: ({ getValue }) => (
      <span className="text-sm truncate max-w-[200px] block">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    accessorKey: 'disputeAmount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        {formatMoney(row.original.disputeAmount ?? 0, row.original.disputeCurrency ?? 'NGN')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Filed',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{formatDate(String(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'isSlaBreached',
    header: 'SLA',
    cell: ({ getValue }) =>
      getValue() ? (
        <span className="text-xs text-red-600 font-medium">Breached</span>
      ) : (
        <span className="text-xs text-green-600">OK</span>
      ),
  },
];

export function CardDisputePage() {
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['card-disputes', statusFilter],
    queryFn: () => cardsApi.getByStatus(statusFilter),
  });

  const openCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING').length;
  const totalAmount = disputes.reduce((sum, d) => sum + (d.disputeAmount ?? 0), 0);
  const breachedCount = disputes.filter((d) => d.isSlaBreached).length;
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED' || d.status === 'CLOSED').length;

  return (
    <>
      <PageHeader title="Disputes & Chargebacks" subtitle="Manage card transaction disputes and chargeback lifecycle" />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Open Disputes" value={openCount} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Total Disputed" value={totalAmount} format="money" compact icon={Scale} loading={isLoading} />
          <StatCard label="SLA Breached" value={breachedCount} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Resolved" value={resolvedCount} format="number" icon={CheckCircle2} loading={isLoading} />
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/40 border-border'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={disputes}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="card-disputes"
          emptyMessage="No disputes found for this status"
          pageSize={15}
        />
      </div>
    </>
  );
}
