import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  Star,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import {
  useFundsByAum,
  useFunds,
  useShariaFunds,
  useCreateFund,
  useUpdateNav,
} from '../../capitalmarkets/hooks/useCapitalMarkets';
import type {
  Fund,
  FundType,
  CreateFundInput,
  NavUpdateInput,
} from '../../capitalmarkets/api/capitalMarketsApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const FUND_TYPE_COLORS: Record<FundType, string> = {
  EQUITY: '#6366f1',
  FIXED_INCOME: '#0ea5e9',
  BALANCED: '#f59e0b',
  MONEY_MARKET: '#22c55e',
  REAL_ESTATE: '#ef4444',
};

// ─── Update NAV Form ──────────────────────────────────────────────────────────

function UpdateNavForm({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const updateNav = useUpdateNav();
  const [form, setForm] = useState<NavUpdateInput>({
    navPerUnit: fund.navPerUnit,
    totalAum: fund.currentAum,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNav.mutate({ code: fund.code, input: form }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Update NAV</h2>
        <p className="text-sm text-muted-foreground mb-4">{fund.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">NAV per Unit</label>
            <input
              type="number"
              className="w-full mt-1 input"
              value={form.navPerUnit}
              onChange={(e) =>
                setForm((f) => ({ ...f, navPerUnit: parseFloat(e.target.value) || 0 }))
              }
              required
              step="0.0001"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Total AUM</label>
            <input
              type="number"
              className="w-full mt-1 input"
              value={form.totalAum}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalAum: parseFloat(e.target.value) || 0 }))
              }
              required
              min={0}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={updateNav.isPending} className="btn-primary">
              {updateNav.isPending ? 'Updating...' : 'Update NAV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Fund Form ─────────────────────────────────────────────────────────

function CreateFundForm({ onClose }: { onClose: () => void }) {
  const createFund = useCreateFund();
  const [form, setForm] = useState<CreateFundInput>({
    name: '',
    type: 'EQUITY',
    currency: 'NGN',
    targetAum: 0,
    shariaCompliant: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFund.mutate(form, { onSuccess: onClose });
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
        <h2 className="text-lg font-semibold mb-4">Create New Fund</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fund Name</label>
            <input
              className="w-full mt-1 input"
              placeholder="Fund name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fund Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as FundType }))
                }
                className="w-full mt-1 input"
              >
                <option value="EQUITY">Equity</option>
                <option value="FIXED_INCOME">Fixed Income</option>
                <option value="BALANCED">Balanced</option>
                <option value="MONEY_MARKET">Money Market</option>
                <option value="REAL_ESTATE">Real Estate</option>
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
            <label className="text-sm font-medium text-muted-foreground">Target AUM</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="0"
              value={form.targetAum || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetAum: parseFloat(e.target.value) || 0 }))
              }
              required
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Manager <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="w-full mt-1 input"
              placeholder="Fund manager name"
              value={form.manager ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="sharia"
              type="checkbox"
              checked={form.shariaCompliant ?? false}
              onChange={(e) => setForm((f) => ({ ...f, shariaCompliant: e.target.checked }))}
              className="w-4 h-4 rounded border-input"
            />
            <label htmlFor="sharia" className="text-sm font-medium">
              Sharia-Compliant Fund
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createFund.isPending} className="btn-primary">
              {createFund.isPending ? 'Creating...' : 'Create Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Fund Card ────────────────────────────────────────────────────────────────

function FundCard({ fund, onUpdateNav }: { fund: Fund; onUpdateNav: (fund: Fund) => void }) {
  const ytd = fund.ytdReturn ?? 0;
  const aumPct = fund.targetAum > 0
    ? Math.min(100, Math.round((fund.currentAum / fund.targetAum) * 100))
    : 0;

  return (
    <div className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{fund.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{fund.code}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={fund.type} />
          {fund.shariaCompliant && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Star className="w-2.5 h-2.5" />
              Sharia
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">AUM</p>
          <p className="font-mono font-semibold text-base">
            {formatMoney(fund.currentAum, fund.currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">NAV / Unit</p>
          <p className="font-mono font-semibold text-base">{fund.navPerUnit.toFixed(4)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>AUM Progress</span>
          <span>{aumPct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${aumPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">YTD Performance</p>
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              ytd >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {ytd >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {ytd >= 0 ? '+' : ''}
            {ytd.toFixed(2)}%
          </div>
        </div>
        <button
          onClick={() => onUpdateNav(fund)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Update NAV
        </button>
      </div>

      {fund.manager && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          Manager: <span className="font-medium text-foreground">{fund.manager}</span>
        </p>
      )}
    </div>
  );
}

// ─── Fund Grid ────────────────────────────────────────────────────────────────

function FundGrid({
  funds,
  isLoading,
  onUpdateNav,
}: {
  funds: Fund[];
  isLoading: boolean;
  onUpdateNav: (fund: Fund) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <EmptyState title="No funds found" description="Create the first fund to get started." />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {funds.map((fund) => (
        <FundCard key={fund.id} fund={fund} onUpdateNav={onUpdateNav} />
      ))}
    </div>
  );
}

// ─── AUM Chart ────────────────────────────────────────────────────────────────

function AumByTypeChart({ funds }: { funds: Fund[] }) {
  const byType = Object.entries(
    funds.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + f.currentAum;
      return acc;
    }, {}),
  ).map(([type, aum]) => ({ type, aum, label: type.replace('_', ' ') }));

  if (byType.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="font-semibold mb-4">AUM by Fund Type</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byType} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number) => [formatMoney(value), 'AUM']}
            labelFormatter={(l) => String(l)}
          />
          <Legend />
          <Bar dataKey="aum" name="AUM" radius={[4, 4, 0, 0]}>
            {byType.map((entry) => (
              <Cell
                key={entry.type}
                fill={FUND_TYPE_COLORS[entry.type as FundType] ?? '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FundManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [navFund, setNavFund] = useState<Fund | null>(null);
  const [activeType, setActiveType] = useState<FundType | undefined>(undefined);

  const { data: allFunds = [], isLoading: allLoading } = useFundsByAum();
  const { data: shariaFunds = [], isLoading: shariaLoading } = useShariaFunds();
  const { data: typeFunds = [], isLoading: typeLoading } = useFunds(activeType);

  const displayFunds = activeType ? typeFunds : allFunds;
  const displayLoading = activeType ? typeLoading : allLoading;

  const totalAum = allFunds.reduce((s, f) => s + f.currentAum, 0);
  const bestPerformer =
    allFunds.length > 0
      ? allFunds.reduce((best, f) =>
          (f.ytdReturn ?? -Infinity) > (best.ytdReturn ?? -Infinity) ? f : best,
        )
      : null;

  const fundTypes: FundType[] = ['EQUITY', 'FIXED_INCOME', 'BALANCED', 'MONEY_MARKET', 'REAL_ESTATE'];

  const tabs = [
    {
      id: 'all',
      label: 'All Funds',
      badge: allFunds.length || undefined,
      content: (
        <FundGrid
          funds={displayFunds}
          isLoading={displayLoading}
          onUpdateNav={setNavFund}
        />
      ),
    },
    ...fundTypes.map((type) => ({
      id: type.toLowerCase(),
      label: type.replace('_', ' '),
      badge: allFunds.filter((f) => f.type === type).length || undefined,
      content: (
        <FundGrid
          funds={allFunds.filter((f) => f.type === type)}
          isLoading={allLoading}
          onUpdateNav={setNavFund}
        />
      ),
    })),
    {
      id: 'sharia',
      label: 'Sharia',
      badge: shariaFunds.length || undefined,
      content: (
        <FundGrid funds={shariaFunds} isLoading={shariaLoading} onUpdateNav={setNavFund} />
      ),
    },
  ];

  return (
    <>
      {showCreate && <CreateFundForm onClose={() => setShowCreate(false)} />}
      {navFund && <UpdateNavForm fund={navFund} onClose={() => setNavFund(null)} />}

      <PageHeader
        title="Fund Management"
        subtitle="Mutual fund AUM, NAV tracking and performance monitoring"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Fund
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Funds AUM"
            value={totalAum}
            format="money"
            compact
            icon={Layers}
          />
          <StatCard
            label="Best Performer (YTD)"
            value={bestPerformer?.ytdReturn ?? 0}
            format="percent"
            trend={
              bestPerformer?.ytdReturn != null && bestPerformer.ytdReturn >= 0 ? 'up' : 'down'
            }
            icon={TrendingUp}
          />
          <StatCard
            label="Sharia-Compliant Funds"
            value={shariaFunds.length}
            format="number"
            icon={Star}
          />
        </div>

        <AumByTypeChart funds={allFunds} />

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
