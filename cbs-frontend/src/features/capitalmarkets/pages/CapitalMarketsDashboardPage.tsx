import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Plus,
  BookOpen,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useCapitalMarketsPipeline,
  usePrivatePlacements,
  useCreateDeal,
} from '../hooks/useCapitalMarkets';
import type { CapitalMarketsDeal, PrivatePlacement, CreateDealInput } from '../api/capitalMarketsApi';

// ─── Deal Status Progress ─────────────────────────────────────────────────────

const DEAL_STAGES: CapitalMarketsDeal['status'][] = [
  'ORIGINATION',
  'STRUCTURING',
  'MARKETING',
  'PRICING',
  'ALLOTMENT',
  'SETTLED',
];

function DealProgress({ status }: { status: CapitalMarketsDeal['status'] }) {
  const idx = DEAL_STAGES.indexOf(status);
  const pct = status === 'SETTLED' ? 100 : Math.round(((idx + 1) / DEAL_STAGES.length) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── New Deal Form ────────────────────────────────────────────────────────────

function NewDealForm({ onClose }: { onClose: () => void }) {
  const createDeal = useCreateDeal();
  const [form, setForm] = useState<CreateDealInput>({
    type: 'ECM',
    issuer: '',
    targetAmount: 0,
    currency: 'NGN',
    tenor: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeal.mutate(form, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New Capital Markets Deal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Deal Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'ECM' | 'DCM' }))}
                className="w-full mt-1 input"
                required
              >
                <option value="ECM">ECM</option>
                <option value="DCM">DCM</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full mt-1 input"
              >
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Issuer</label>
            <input
              className="w-full mt-1 input"
              placeholder="Issuer name"
              value={form.issuer}
              onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Target Amount</label>
              <input
                type="number"
                className="w-full mt-1 input"
                placeholder="0"
                value={form.targetAmount || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))
                }
                required
                min={0}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tenor</label>
              <input
                className="w-full mt-1 input"
                placeholder="e.g. 5Y, 90D"
                value={form.tenor}
                onChange={(e) => setForm((f) => ({ ...f, tenor: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDeal.isPending}
              className="btn-primary"
            >
              {createDeal.isPending ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deal Pipeline Table ──────────────────────────────────────────────────────

function DealPipelineTable({
  deals,
  isLoading,
  type,
}: {
  deals: CapitalMarketsDeal[];
  isLoading: boolean;
  type: 'ECM' | 'DCM';
}) {
  const navigate = useNavigate();
  const filtered = deals.filter((d) => d.type === type);

  const columns: ColumnDef<CapitalMarketsDeal, any>[] = [
    {
      accessorKey: 'code',
      header: 'Deal Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'issuer',
      header: 'Issuer',
      cell: ({ row }) => <span className="font-medium">{row.original.issuer}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.original.type === 'ECM'
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'targetAmount',
      header: 'Target Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.targetAmount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => <DealProgress status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/capital-markets/deals/${row.original.code}`)}
            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            View
          </button>
          <button
            onClick={() =>
              navigate(`/capital-markets/deals/${row.original.code}?tab=investors`)
            }
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Investor Book
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage={`No ${type} deals in pipeline`}
      />
    </div>
  );
}

// ─── Private Placements Table ─────────────────────────────────────────────────

function PlacementsTable({
  placements,
  isLoading,
}: {
  placements: PrivatePlacement[];
  isLoading: boolean;
}) {
  const columns: ColumnDef<PrivatePlacement, any>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'issuer',
      header: 'Issuer',
      cell: ({ row }) => <span className="font-medium">{row.original.issuer}</span>,
    },
    {
      accessorKey: 'instrumentType',
      header: 'Instrument',
      cell: ({ row }) => <StatusBadge status={row.original.instrumentType} />,
    },
    {
      accessorKey: 'targetAmount',
      header: 'Target',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.targetAmount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'totalFunded',
      header: 'Funded',
      cell: ({ row }) => {
        const pct = row.original.totalFunded
          ? Math.min(100, Math.round((row.original.totalFunded / row.original.targetAmount) * 100))
          : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={placements}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No active private placements"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CapitalMarketsDashboardPage() {
  const [showNewDeal, setShowNewDeal] = useState(false);
  const { data: pipeline = [], isLoading: pipelineLoading } = useCapitalMarketsPipeline();
  const { data: placements = [], isLoading: placementsLoading } = usePrivatePlacements();

  const activeDeals = pipeline.filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED');
  const settledDeals = pipeline.filter((d) => d.status === 'SETTLED');
  const pipelineValue = pipeline.reduce((s, d) => s + d.targetAmount, 0);
  const feesEarned = pipeline.reduce((s, d) => s + (d.feesEarned ?? 0), 0);

  const tabs = [
    {
      id: 'ecm',
      label: 'ECM Deals',
      badge: pipeline.filter((d) => d.type === 'ECM').length || undefined,
      content: (
        <DealPipelineTable deals={pipeline} isLoading={pipelineLoading} type="ECM" />
      ),
    },
    {
      id: 'dcm',
      label: 'DCM Deals',
      badge: pipeline.filter((d) => d.type === 'DCM').length || undefined,
      content: (
        <DealPipelineTable deals={pipeline} isLoading={pipelineLoading} type="DCM" />
      ),
    },
    {
      id: 'placements',
      label: 'Private Placements',
      badge: placements.length || undefined,
      content: (
        <PlacementsTable placements={placements} isLoading={placementsLoading} />
      ),
    },
  ];

  return (
    <>
      {showNewDeal && <NewDealForm onClose={() => setShowNewDeal(false)} />}

      <PageHeader
        title="Capital Markets"
        subtitle="ECM/DCM deal pipeline, book building, allotments & private placements"
        actions={
          <button
            onClick={() => setShowNewDeal(true)}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Deals"
            value={activeDeals.length}
            format="number"
            icon={Briefcase}
          />
          <StatCard
            label="Pipeline Value"
            value={pipelineValue / 1_000_000_000}
            format="number"
            icon={DollarSign}
            compact
          />
          <StatCard
            label="Deals Closed (Qtr)"
            value={settledDeals.length}
            format="number"
            icon={CheckCircle2}
          />
          <StatCard
            label="Total Fees Earned"
            value={feesEarned}
            format="money"
            icon={TrendingUp}
            compact
          />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
