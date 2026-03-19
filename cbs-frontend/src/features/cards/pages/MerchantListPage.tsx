import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { Plus, Store, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { mockMerchants } from '../api/mockCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { Merchant } from '../types/card';
import { cn } from '@/lib/utils';

const riskColors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600', PROHIBITED: 'text-red-800' };

const columns: ColumnDef<Merchant, any>[] = [
  { accessorKey: 'merchantId', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.merchantId}</span> },
  { accessorKey: 'merchantName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.merchantName}</span> },
  { accessorKey: 'mccDescription', header: 'MCC' },
  { accessorKey: 'terminalCount', header: 'Terminals', cell: ({ row }) => row.original.terminalCount.toLocaleString() },
  { accessorKey: 'monthlyVolume', header: 'Monthly Vol.', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.monthlyVolume)}</span> },
  { accessorKey: 'mdrRate', header: 'MDR', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.mdrRate)}</span> },
  { accessorKey: 'chargebackRate', header: 'CB %', cell: ({ row }) => <span className={cn('font-mono text-sm', row.original.chargebackRate > 1 ? 'text-red-600 font-bold' : '')}>{formatPercent(row.original.chargebackRate)}</span> },
  { accessorKey: 'riskCategory', header: 'Risk', cell: ({ row }) => <span className={cn('text-xs font-bold', riskColors[row.original.riskCategory])}>{row.original.riskCategory}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function MerchantListPage() {
  const navigate = useNavigate();
  const totalVolume = mockMerchants.reduce((s, m) => s + m.monthlyVolume, 0);
  const mdrRevenue = mockMerchants.reduce((s, m) => s + m.monthlyVolume * m.mdrRate / 100, 0);

  return (
    <>
      <PageHeader title="Merchant Management" actions={
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Onboard Merchant
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Merchants" value={mockMerchants.filter((m) => m.status === 'ACTIVE').length} format="number" icon={Store} />
          <StatCard label="Monthly Volume" value={totalVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="MDR Revenue" value={mdrRevenue} format="money" compact />
          <StatCard label="High Risk" value={mockMerchants.filter((m) => m.riskCategory === 'HIGH').length} format="number" icon={AlertTriangle} />
        </div>
        <DataTable columns={columns} data={mockMerchants} enableGlobalFilter enableExport exportFilename="merchants" onRowClick={(row) => navigate(`/cards/merchants/${row.id}`)} />
      </div>
    </>
  );
}
