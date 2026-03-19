import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { BarChart2, AlertTriangle, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { tradingApi, type TraderPosition } from '../api/tradingApi';

const columns: ColumnDef<TraderPosition, unknown>[] = [
  {
    accessorKey: 'dealerName',
    header: 'Dealer',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'instrument',
    header: 'Instrument',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'currency',
    header: 'CCY',
    cell: ({ getValue }) => (
      <span className="text-xs font-mono">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'longPosition',
    header: 'Long',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block text-green-600">
        {formatMoney(row.original.longPosition, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'shortPosition',
    header: 'Short',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block text-red-600">
        {formatMoney(row.original.shortPosition, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'netExposure',
    header: 'Net Exposure',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block font-semibold">
        {formatMoney(row.original.netExposure, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'utilizationPct',
    header: 'Utilization',
    cell: ({ getValue }) => {
      const pct = Number(getValue());
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs">{pct.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'unrealizedPnl',
    header: 'Unrealized P&L',
    cell: ({ row }) => {
      const pnl = row.original.unrealizedPnl;
      return (
        <span className={`text-sm font-mono text-right block ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatMoney(pnl, row.original.currency)}
        </span>
      );
    },
  },
  {
    accessorKey: 'breachFlag',
    header: 'Breach',
    cell: ({ getValue }) =>
      getValue() ? (
        <StatusBadge status="BREACH" />
      ) : (
        <span className="text-xs text-green-600">Clear</span>
      ),
  },
];

export function TreasuryPositionsPage() {
  const [selectedDeskId, setSelectedDeskId] = useState<string>('');

  const { data: desks = [], isLoading: desksLoading } = useQuery({
    queryKey: ['dealer-desks'],
    queryFn: () => tradingApi.listDealerDesks(),
  });

  // Use the first desk by default
  const activeDeskId = selectedDeskId || desks[0]?.id || '';

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['trader-positions', activeDeskId],
    queryFn: () => tradingApi.getPositionsByDealer(activeDeskId),
    enabled: !!activeDeskId,
  });

  const isLoading = desksLoading || positionsLoading;
  const totalNetExposure = positions.reduce((sum, p) => sum + p.netExposure, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const breachCount = positions.filter((p) => p.breachFlag).length;

  return (
    <>
      <PageHeader title="Trader Positions" subtitle="Real-time position monitoring across desks and instruments" />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Positions" value={positions.length} format="number" icon={BarChart2} loading={isLoading} />
          <StatCard label="Net Exposure" value={totalNetExposure} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Unrealized P&L" value={totalPnl} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Breaches" value={breachCount} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        {/* Desk selector */}
        {desks.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {desks.map((desk) => (
              <button
                key={desk.id}
                onClick={() => setSelectedDeskId(desk.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activeDeskId === desk.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted/40 border-border'
                }`}
              >
                {desk.name}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <DataTable
          columns={columns}
          data={positions}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="trader-positions"
          emptyMessage="No positions found for this desk"
          pageSize={20}
        />
      </div>
    </>
  );
}
