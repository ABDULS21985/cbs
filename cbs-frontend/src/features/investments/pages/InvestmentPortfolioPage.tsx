import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  useInvestmentPortfolios,
  usePortfolioHoldings,
  useCreatePortfolio,
  useShariaFunds,
  useFundsByAum,
} from '../../capitalmarkets/hooks/useCapitalMarkets';
import type {
  InvestmentPortfolio,
  CreatePortfolioInput,
  PortfolioType,
  Fund,
} from '../../capitalmarkets/api/capitalMarketsApi';

// ─── Colour palette for pie chart ─────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  EQUITY: '#6366f1',
  FIXED_INCOME: '#0ea5e9',
  CASH: '#22c55e',
  ALTERNATIVE: '#f59e0b',
  COMMODITY: '#ef4444',
};

// ─── Holdings Expandable Row ──────────────────────────────────────────────────

function HoldingsRow({ portfolioCode }: { portfolioCode: string }) {
  const { data: holdings = [], isLoading } = usePortfolioHoldings(portfolioCode);

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        <div className="h-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-muted-foreground">
        No holdings in this portfolio.
      </div>
    );
  }

  const pieData = Object.entries(
    holdings.reduce<Record<string, number>>((acc, h) => {
      acc[h.holdingType] = (acc[h.holdingType] ?? 0) + (h.currentValue ?? h.quantity * h.costPrice);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="px-6 py-4 border-t bg-muted/20">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 font-medium">Instrument</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Cost</th>
                <th className="pb-2 font-medium text-right">Current</th>
                <th className="pb-2 font-medium text-right">Unrealized P&L</th>
                <th className="pb-2 font-medium text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {holdings.map((h) => (
                <tr key={h.id}>
                  <td className="py-2">
                    <div className="font-medium">{h.instrumentName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {h.instrumentCode}
                    </div>
                  </td>
                  <td className="py-2">
                    <StatusBadge status={h.holdingType} />
                  </td>
                  <td className="py-2 text-right font-mono">
                    {h.quantity.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatMoney(h.costPrice, h.currency)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {h.currentPrice != null ? formatMoney(h.currentPrice, h.currency) : '—'}
                  </td>
                  <td
                    className={`py-2 text-right font-mono font-medium ${
                      (h.unrealizedPnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {h.unrealizedPnl != null ? formatMoney(h.unrealizedPnl, h.currency) : '—'}
                    {h.unrealizedPnlPct != null && (
                      <span className="text-xs ml-1">
                        ({h.unrealizedPnlPct >= 0 ? '+' : ''}
                        {h.unrealizedPnlPct.toFixed(2)}%)
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {h.weight != null ? `${h.weight.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pieData.length > 0 && (
          <div className="w-full lg:w-56">
            <p className="text-sm font-medium mb-2 text-muted-foreground">Asset Allocation</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={72}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  labelFormatter={(label) => String(label)}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Portfolios Table ─────────────────────────────────────────────────────────

function PortfoliosTable({
  portfolios,
  isLoading,
}: {
  portfolios: InvestmentPortfolio[];
  isLoading: boolean;
}) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const toggle = (code: string) =>
    setExpandedCode((prev) => (prev === code ? null : code));

  const columns: ColumnDef<InvestmentPortfolio, any>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => toggle(row.original.code)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          {expandedCode === row.original.code ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.customerName ?? `#${row.original.customerId}`}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'totalValue',
      header: 'Total Value',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {formatMoney(row.original.totalValue, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'benchmark',
      header: 'Benchmark',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.benchmark ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'returnYtd',
      header: 'Return YTD',
      cell: ({ row }) => {
        const r = row.original.returnYtd;
        if (r == null) return <span className="text-muted-foreground">—</span>;
        return (
          <span
            className={`flex items-center gap-1 font-mono text-sm font-medium ${
              r >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {r >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {r >= 0 ? '+' : ''}
            {r.toFixed(2)}%
          </span>
        );
      },
    },
    {
      accessorKey: 'manager',
      header: 'Manager',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.manager ?? '—'}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        title="No portfolios found"
        description="Create the first investment portfolio to get started."
      />
    );
  }

  return (
    <div>
      <div className="p-4">
        <DataTable
          columns={columns}
          data={portfolios}
          enableGlobalFilter
          emptyMessage="No portfolios found"
        />
      </div>
      {expandedCode && (
        <HoldingsRow portfolioCode={expandedCode} />
      )}
    </div>
  );
}

// ─── Funds Table ──────────────────────────────────────────────────────────────

function FundsTable({ funds, isLoading }: { funds: Fund[]; isLoading: boolean }) {
  const columns: ColumnDef<Fund, any>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Fund Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'currentAum',
      header: 'AUM',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.currentAum, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'navPerUnit',
      header: 'NAV / Unit',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.navPerUnit.toFixed(4)}</span>
      ),
    },
    {
      accessorKey: 'ytdReturn',
      header: 'YTD Return',
      cell: ({ row }) => {
        const r = row.original.ytdReturn;
        if (r == null) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={`font-mono text-sm font-medium ${r >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {r >= 0 ? '+' : ''}{r.toFixed(2)}%
          </span>
        );
      },
    },
    {
      accessorKey: 'shariaCompliant',
      header: 'Sharia',
      cell: ({ row }) =>
        row.original.shariaCompliant ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Sharia
          </span>
        ) : null,
    },
    {
      accessorKey: 'manager',
      header: 'Manager',
      cell: ({ row }) => <span className="text-sm">{row.original.manager ?? '—'}</span>,
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={funds}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No funds found"
      />
    </div>
  );
}

// ─── Create Portfolio Form ────────────────────────────────────────────────────

function CreatePortfolioForm({ onClose }: { onClose: () => void }) {
  const createPortfolio = useCreatePortfolio();
  const [form, setForm] = useState<CreatePortfolioInput>({
    customerId: 0,
    type: 'DISCRETIONARY',
    name: '',
    currency: 'NGN',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPortfolio.mutate(form, { onSuccess: onClose });
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
        <h2 className="text-lg font-semibold mb-4">Create Investment Portfolio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="Customer ID"
              value={form.customerId || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: parseInt(e.target.value, 10) || 0 }))
              }
              required
              min={1}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Portfolio Name</label>
            <input
              className="w-full mt-1 input"
              placeholder="Portfolio name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as PortfolioType }))
                }
                className="w-full mt-1 input"
              >
                <option value="DISCRETIONARY">Discretionary</option>
                <option value="ADVISORY">Advisory</option>
                <option value="EXECUTION_ONLY">Execution Only</option>
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Benchmark <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g. NSE All-Share Index"
              value={form.benchmark ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, benchmark: e.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Manager <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="w-full mt-1 input"
              placeholder="Portfolio manager name"
              value={form.manager ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value || undefined }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPortfolio.isPending}
              className="btn-primary"
            >
              {createPortfolio.isPending ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function InvestmentPortfolioPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: portfolios = [], isLoading: portfoliosLoading } = useInvestmentPortfolios();
  const { data: allFunds = [], isLoading: fundsLoading } = useFundsByAum();
  const { data: shariaFunds = [], isLoading: shariaLoading } = useShariaFunds();

  const totalAum = portfolios.reduce((s, p) => s + p.totalValue, 0);
  const avgReturnYtd =
    portfolios.length > 0
      ? portfolios.reduce((s, p) => s + (p.returnYtd ?? 0), 0) / portfolios.length
      : 0;
  const todayReturn = 0; // Would need real-time data

  const tabs = [
    {
      id: 'portfolios',
      label: 'Portfolios',
      badge: portfolios.length || undefined,
      content: (
        <PortfoliosTable portfolios={portfolios} isLoading={portfoliosLoading} />
      ),
    },
    {
      id: 'funds',
      label: 'Funds',
      badge: allFunds.length || undefined,
      content: <FundsTable funds={allFunds} isLoading={fundsLoading} />,
    },
    {
      id: 'sharia',
      label: 'Sharia-Compliant',
      badge: shariaFunds.length || undefined,
      content: <FundsTable funds={shariaFunds} isLoading={shariaLoading} />,
    },
  ];

  return (
    <>
      {showCreate && <CreatePortfolioForm onClose={() => setShowCreate(false)} />}

      <PageHeader
        title="Investment Portfolios"
        subtitle="Discretionary & advisory portfolio management, holdings and valuations"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Portfolio
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total AUM"
            value={totalAum}
            format="money"
            compact
            icon={Briefcase}
          />
          <StatCard
            label="Number of Portfolios"
            value={portfolios.length}
            format="number"
            icon={BarChart3}
          />
          <StatCard
            label="Today's Return"
            value={todayReturn}
            format="percent"
            trend={todayReturn >= 0 ? 'up' : 'down'}
            icon={TrendingUp}
          />
          <StatCard
            label="YTD Return (Avg)"
            value={avgReturnYtd}
            format="percent"
            trend={avgReturnYtd >= 0 ? 'up' : 'down'}
            icon={TrendingUp}
          />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
