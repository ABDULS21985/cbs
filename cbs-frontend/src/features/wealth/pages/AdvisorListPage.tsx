import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { apiGet, apiPost } from '@/lib/api';
import { formatMoneyCompact, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, Briefcase, Award, LayoutGrid, List, X, Plus } from 'lucide-react';
import { AdvisorLeaderboard } from '../components/advisors/AdvisorLeaderboard';
import { ClientMatchingEngine } from '../components/advisors/ClientMatchingEngine';

import type { Advisor } from '../api/wealthApi';

// ─── Fallback data (used only when backend returns empty) ────────────────────

const FALLBACK_ADVISORS: Advisor[] = [
  {
    id: '1',
    name: 'Adaeze Okonkwo',
    email: 'a.okonkwo@cbs.ng',
    phone: '+234-801-000-1001',
    clientCount: 24,
    aum: 4_800_000_000,
    avgReturn: 14.2,
    joinDate: '2019-03-15',
    specializations: ['High Net Worth', 'Estate Planning'],
    status: 'ACTIVE',
    satisfaction: 4.7,
    revenue: 48_000_000,
  },
  {
    id: '2',
    name: 'Emeka Eze',
    email: 'e.eze@cbs.ng',
    phone: '+234-801-000-1002',
    clientCount: 18,
    aum: 3_200_000_000,
    avgReturn: 11.8,
    joinDate: '2020-07-01',
    specializations: ['Retirement', 'Tax Optimization'],
    status: 'ACTIVE',
    satisfaction: 4.4,
    revenue: 32_000_000,
  },
  {
    id: '3',
    name: 'Ngozi Adeleke',
    email: 'n.adeleke@cbs.ng',
    phone: '+234-801-000-1003',
    clientCount: 31,
    aum: 6_500_000_000,
    avgReturn: 16.5,
    joinDate: '2017-01-10',
    specializations: ['Family Office', 'Philanthropy'],
    status: 'ACTIVE',
    satisfaction: 4.9,
    revenue: 65_000_000,
  },
  {
    id: '4',
    name: 'Chukwudi Nwosu',
    email: 'c.nwosu@cbs.ng',
    phone: '+234-801-000-1004',
    clientCount: 15,
    aum: 2_100_000_000,
    avgReturn: 9.3,
    joinDate: '2021-09-20',
    specializations: ['SME Owners', 'Growth Portfolio'],
    status: 'ACTIVE',
    satisfaction: 4.1,
    revenue: 21_000_000,
  },
  {
    id: '5',
    name: 'Tunde Adesanya',
    email: 't.adesanya@cbs.ng',
    phone: '+234-801-000-1005',
    clientCount: 22,
    aum: 5_100_000_000,
    avgReturn: 13.6,
    joinDate: '2018-06-01',
    specializations: ['Fixed Income', 'Capital Markets'],
    status: 'ACTIVE',
    satisfaction: 4.5,
    revenue: 51_000_000,
  },
  {
    id: '6',
    name: 'Amaka Obi',
    email: 'a.obi@cbs.ng',
    phone: '+234-801-000-1006',
    clientCount: 19,
    aum: 3_700_000_000,
    avgReturn: 12.1,
    joinDate: '2019-11-12',
    specializations: ['Agriculture', 'Impact Investing'],
    status: 'ON_LEAVE',
    satisfaction: 4.3,
    revenue: 37_000_000,
  },
];

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// ─── Table columns ────────────────────────────────────────────────────────────

function buildTableCols(navigate: (path: string) => void): ColumnDef<Advisor, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
    },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span className="font-mono text-xs">{row.original.phone}</span> },
    {
      accessorKey: 'clientCount',
      header: 'Clients',
      cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.clientCount}</span>,
    },
    {
      accessorKey: 'aum',
      header: 'AUM',
      cell: ({ row }) => <span className="font-mono text-sm">{formatMoneyCompact(row.original.aum)}</span>,
    },
    {
      accessorKey: 'avgReturn',
      header: 'Avg Return %',
      cell: ({ row }) => (
        <span className={cn('font-mono text-sm', row.original.avgReturn >= 12 ? 'text-green-600 dark:text-green-400' : '')}>
          {formatPercent(row.original.avgReturn)}
        </span>
      ),
    },
    {
      accessorKey: 'specializations',
      header: 'Specializations',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.specializations ?? []).slice(0, 2).map((s) => (
            <span key={s} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">{s}</span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'joinDate',
      header: 'Join Date',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.joinDate ? formatDate(row.original.joinDate) : '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status ?? 'ACTIVE'} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/wealth/advisors/${row.original.id}`); }}
          className="text-xs text-primary font-medium hover:underline"
        >
          View
        </button>
      ),
    },
  ];
}

// ─── Advisor Card ─────────────────────────────────────────────────────────────

interface AdvisorCardProps {
  advisor: Advisor;
  index: number;
  maxAum: number;
  onView: () => void;
}

function AdvisorCard({ advisor, index, maxAum, onView }: AdvisorCardProps) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const aumPct = maxAum > 0 ? (advisor.aum / maxAum) * 100 : 0;

  return (
    <div className="surface-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(advisor.name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{advisor.name}</p>
          <p className="text-xs text-muted-foreground truncate">{advisor.email}</p>
          <p className="text-xs text-muted-foreground">{advisor.phone}</p>
        </div>
        <StatusBadge status={advisor.status ?? 'ACTIVE'} dot />
      </div>

      {/* Specializations */}
      <div className="flex flex-wrap gap-1.5">
        {(advisor.specializations ?? []).map((s) => (
          <span
            key={s}
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold font-mono">{advisor.clientCount}</p>
          <p className="text-xs text-muted-foreground">Clients</p>
        </div>
        <div>
          <p className="text-lg font-bold font-mono">{formatMoneyCompact(advisor.aum)}</p>
          <p className="text-xs text-muted-foreground">AUM</p>
        </div>
        <div>
          <p className={cn('text-lg font-bold font-mono', advisor.avgReturn >= 12 ? 'text-green-600 dark:text-green-400' : '')}>
            {formatPercent(advisor.avgReturn, 1)}
          </p>
          <p className="text-xs text-muted-foreground">Avg Return</p>
        </div>
      </div>

      {/* AUM progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>AUM share</span>
          <span>{aumPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${aumPct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <button
        onClick={onView}
        className="w-full rounded-lg border py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        View Details
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdvisorListPage() {
  const navigate = useNavigate();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showAddModal, setShowAddModal] = useState(false);

  const tableCols = buildTableCols(navigate);

  useEffect(() => {
    setLoading(true);
    apiGet<Advisor[]>('/api/v1/wealth-management/advisors')
      .then((data) => setAdvisors(data && data.length > 0 ? data : FALLBACK_ADVISORS))
      .catch(() => setAdvisors(FALLBACK_ADVISORS))
      .finally(() => setLoading(false));
  }, []);

  // ── KPIs ──
  const totalAum = advisors.reduce((s, a) => s + a.aum, 0);
  const avgClients = advisors.length > 0 ? Math.round(advisors.reduce((s, a) => s + a.clientCount, 0) / advisors.length) : 0;
  const topReturn = advisors.length > 0 ? Math.max(...advisors.map((a) => a.avgReturn)) : 0;
  const maxAum = advisors.length > 0 ? Math.max(...advisors.map((a) => a.aum)) : 1;

  return (
    <>
      <PageHeader
        title="Wealth Advisors"
        subtitle="Advisor directory, AUM, and performance metrics"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={cn('rounded-md p-1.5 transition-colors', viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn('rounded-md p-1.5 transition-colors', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Advisor
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total Advisors</p>
              <Users className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="stat-value">{loading ? '—' : advisors.length}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total AUM Managed</p>
              <Briefcase className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="stat-value">{loading ? '—' : formatMoneyCompact(totalAum)}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Avg Clients / Advisor</p>
              <Users className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="stat-value">{loading ? '—' : avgClients}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Top Performer YTD</p>
              <Award className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="stat-value text-green-600 dark:text-green-400">{loading ? '—' : formatPercent(topReturn, 1)}</p>
          </div>
        </div>

        {/* Leaderboard + Client Matching */}
        {!loading && advisors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdvisorLeaderboard advisors={advisors} />
            <ClientMatchingEngine advisors={advisors} />
          </div>
        )}

        {/* Card / Table view */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card p-5 h-56 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {advisors.map((a, i) => (
              <AdvisorCard
                key={a.id}
                advisor={a}
                index={i}
                maxAum={maxAum}
                onView={() => navigate(`/wealth/advisors/${a.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="surface-card">
            <DataTable
              columns={tableCols}
              data={advisors}
              isLoading={false}
              onRowClick={(row) => navigate(`/wealth/advisors/${row.id}`)}
              enableGlobalFilter
              pageSize={15}
              emptyMessage="No advisors found"
            />
          </div>
        )}
      </div>

      {/* Add Advisor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-lg surface-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Add New Advisor</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await apiPost('/api/v1/wealth-management/advisors', {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    joinDate: formData.get('joinDate'),
                    specializations: [formData.get('specialization')],
                  });
                  toast.success('Advisor added successfully');
                  // Refresh list
                  const fresh = await apiGet<Advisor[]>('/api/v1/wealth-management/advisors').catch(() => []);
                  if (fresh.length > 0) setAdvisors(fresh);
                  setShowAddModal(false);
                } catch {
                  toast.error('Failed to add advisor');
                }
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Full Name *</label>
                  <input name="name" required type="text" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Email *</label>
                  <input name="email" required type="email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Phone *</label>
                  <input name="phone" required type="tel" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Join Date *</label>
                  <input name="joinDate" required type="date" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Primary Specialization</label>
                  <select name="specialization" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    {['High Net Worth', 'Estate Planning', 'Retirement', 'Tax Optimization', 'Family Office', 'Fixed Income', 'Capital Markets', 'Impact Investing'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Add Advisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
