import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { Plus, Store, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { useMerchants } from '../hooks/useCardData';
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
  const { data: merchants = [], isLoading } = useMerchants();

  const totalVolume = merchants.reduce((s, m) => s + m.monthlyVolume, 0);
  const mdrRevenue = merchants.reduce((s, m) => s + m.monthlyVolume * m.mdrRate / 100, 0);

  return (
    <>
      <PageHeader title="Merchant Management" actions={
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Onboard Merchant
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Merchants" value={merchants.filter((m) => m.status === 'ACTIVE').length} format="number" icon={Store} />
          <StatCard label="Monthly Volume" value={totalVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="MDR Revenue" value={mdrRevenue} format="money" compact />
          <StatCard label="High Risk" value={merchants.filter((m) => m.riskCategory === 'HIGH').length} format="number" icon={AlertTriangle} />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading merchants…
          </div>
        ) : merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Store className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No merchants found.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={merchants} enableGlobalFilter enableExport exportFilename="merchants" onRowClick={(row) => navigate(`/cards/merchants/${row.id}`)} />
        )}
      </div>
    </>
  );
}
