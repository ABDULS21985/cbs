import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { apiGet } from '@/lib/api';
import { formatMoney, formatMoneyCompact, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AlertCircle, Loader2, Award, Calendar, X, Plus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientCount: number;
  aum: number;
  avgReturn: number;
  joinDate: string;
  specializations: string[];
  revenue?: number;
  satisfaction?: number;
  status?: string;
}

interface ClientPlan {
  id: string;
  clientName: string;
  planCode: string;
  aum: number;
  planType: string;
  riskProfile: string;
  status: string;
  lastReview: string;
}

interface ScheduleReview {
  id: string;
  clientName: string;
  planCode: string;
  dateTime: string;
  reviewType: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'OVERDUE';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Profile', 'Portfolio', 'Schedule'] as const;
type Tab = (typeof TABS)[number];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const AVATAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AWARDS = [
  { title: 'Q3 2025 Top Performer', icon: '🏆', color: '#f59e0b' },
  { title: 'Best Client Retention 2024', icon: '⭐', color: '#10b981' },
  { title: 'Q1 2025 Rising Star', icon: '🚀', color: '#3b82f6' },
];

// ─── Mock data builders ───────────────────────────────────────────────────────

const MOCK_ADVISORS: Record<string, Advisor> = {
  '1': { id: '1', name: 'Adaeze Okonkwo', email: 'a.okonkwo@cbs.ng', phone: '+234-801-000-1001', clientCount: 24, aum: 4_800_000_000, avgReturn: 14.2, joinDate: '2019-03-15', specializations: ['High Net Worth', 'Estate Planning'], status: 'ACTIVE', satisfaction: 4.7 },
  '2': { id: '2', name: 'Emeka Eze', email: 'e.eze@cbs.ng', phone: '+234-801-000-1002', clientCount: 18, aum: 3_200_000_000, avgReturn: 11.8, joinDate: '2020-07-01', specializations: ['Retirement', 'Tax Optimization'], status: 'ACTIVE', satisfaction: 4.4 },
  '3': { id: '3', name: 'Ngozi Adeleke', email: 'n.adeleke@cbs.ng', phone: '+234-801-000-1003', clientCount: 31, aum: 6_500_000_000, avgReturn: 16.5, joinDate: '2017-01-10', specializations: ['Family Office', 'Philanthropy'], status: 'ACTIVE', satisfaction: 4.9 },
  '4': { id: '4', name: 'Chukwudi Nwosu', email: 'c.nwosu@cbs.ng', phone: '+234-801-000-1004', clientCount: 15, aum: 2_100_000_000, avgReturn: 9.3, joinDate: '2021-09-20', specializations: ['SME Owners', 'Growth Portfolio'], status: 'ACTIVE', satisfaction: 4.1 },
  '5': { id: '5', name: 'Tunde Adesanya', email: 't.adesanya@cbs.ng', phone: '+234-801-000-1005', clientCount: 22, aum: 5_100_000_000, avgReturn: 13.6, joinDate: '2018-06-01', specializations: ['Fixed Income', 'Capital Markets'], status: 'ACTIVE', satisfaction: 4.5 },
  '6': { id: '6', name: 'Amaka Obi', email: 'a.obi@cbs.ng', phone: '+234-801-000-1006', clientCount: 19, aum: 3_700_000_000, avgReturn: 12.1, joinDate: '2019-11-12', specializations: ['Agriculture', 'Impact Investing'], status: 'ON_LEAVE', satisfaction: 4.3 },
};

function buildMockClients(advisorAum: number): ClientPlan[] {
  const types = ['DISCRETIONARY', 'ADVISORY', 'EXECUTION_ONLY'];
  const risks = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'BALANCED'];
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'UNDER_REVIEW'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`,
    clientName: ['Babatunde Fashola', 'Obiageli Ezekwesili', 'Aliko Dangote Jr', 'Folorunsho Alakija II', 'Innocent Chukwuma', 'Tara Durotoye', 'Jim Ovia II', 'Tonye Cole'][i],
    planCode: `WP-20${24 - Math.floor(i / 2)}-${String(1000 + i * 37).padStart(4, '0')}`,
    aum: Math.round((advisorAum / 8) * (0.6 + Math.random() * 0.8)),
    planType: types[i % types.length],
    riskProfile: risks[i % risks.length],
    status: statuses[i % statuses.length],
    lastReview: new Date(Date.now() - (i + 1) * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
  }));
}

function buildAumTrend(baseAum: number) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const growth = 1 + (i * 0.012) + (Math.sin(i) * 0.005);
    return {
      month: MONTHS[d.getMonth()],
      aum: Math.round(baseAum * growth * 0.88),
    };
  });
}

function buildSchedule(): ScheduleReview[] {
  const base = Date.now();
  const names = ['Babatunde Fashola', 'Obiageli Ezekwesili', 'Aliko Dangote Jr', 'Folorunsho Alakija II', 'Innocent Chukwuma'];
  const types = ['ANNUAL_REVIEW', 'QUARTERLY_UPDATE', 'REBALANCING', 'ONBOARDING', 'AD_HOC'];
  const statuses: ScheduleReview['status'][] = ['CONFIRMED', 'SCHEDULED', 'OVERDUE', 'SCHEDULED', 'CONFIRMED'];
  return names.map((name, i) => ({
    id: `s${i}`,
    clientName: name,
    planCode: `WP-2024-${String(1001 + i * 37).padStart(4, '0')}`,
    dateTime: new Date(base + (i - 1) * 5 * 24 * 3600 * 1000).toISOString(),
    reviewType: types[i],
    status: statuses[i],
  }));
}

function buildAllocationData() {
  return [
    { name: 'Equities', value: 42 },
    { name: 'Fixed Income', value: 28 },
    { name: 'Real Estate', value: 14 },
    { name: 'Alternatives', value: 9 },
    { name: 'Cash', value: 7 },
  ];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ─── Client table columns ─────────────────────────────────────────────────────

const clientCols: ColumnDef<ClientPlan, unknown>[] = [
  {
    accessorKey: 'clientName',
    header: 'Client Name',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.clientName}</span>,
  },
  {
    accessorKey: 'planCode',
    header: 'Plan Code',
    cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.planCode}</span>,
  },
  {
    accessorKey: 'aum',
    header: 'AUM',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoneyCompact(row.original.aum)}</span>,
  },
  {
    accessorKey: 'planType',
    header: 'Plan Type',
    cell: ({ row }) => <StatusBadge status={row.original.planType} />,
  },
  {
    accessorKey: 'riskProfile',
    header: 'Risk Profile',
    cell: ({ row }) => <span className="text-sm">{row.original.riskProfile}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'lastReview',
    header: 'Last Review',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.lastReview)}</span>,
  },
];

// ─── Schedule status colors ───────────────────────────────────────────────────

const SCHEDULE_STATUS_STYLES: Record<ScheduleReview['status'], string> = {
  CONFIRMED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SCHEDULED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdvisorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [clients, setClients] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<Advisor>(`/api/v1/wealth-management/advisors/${id}`)
      .then((data) => {
        const a = data ?? MOCK_ADVISORS[id] ?? null;
        setAdvisor(a);
        if (a) setClients(buildMockClients(a.aum));
      })
      .catch(() => {
        const fallback = MOCK_ADVISORS[id] ?? null;
        setAdvisor(fallback);
        if (fallback) setClients(buildMockClients(fallback.aum));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Advisor not found</p>
      </div>
    );
  }

  const avatarColor = AVATAR_COLORS[(parseInt(advisor.id, 10) || 0) % AVATAR_COLORS.length];
  const aumTrend = buildAumTrend(advisor.aum);
  const schedule = buildSchedule();
  const allocationData = buildAllocationData();
  const top5Clients = [...clients].sort((a, b) => b.aum - a.aum).slice(0, 5);

  return (
    <>
      <PageHeader
        title={advisor.name}
        subtitle="Wealth Advisor"
        backTo="/wealth/advisors"
        actions={<StatusBadge status={advisor.status ?? 'ACTIVE'} size="md" dot />}
      />

      <div className="page-container space-y-6">
        {/* Profile strip */}
        <div className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(advisor.name)}
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Clients', value: advisor.clientCount.toString() },
              { label: 'AUM', value: formatMoneyCompact(advisor.aum) },
              { label: 'Avg Return', value: formatPercent(advisor.avgReturn, 1) },
              { label: 'Join Date', value: formatDate(advisor.joinDate) },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold font-mono mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab: Profile ── */}
        {activeTab === 'Profile' && (
          <div className="space-y-6">
            {/* Contact & Specializations */}
            <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
                <dl className="space-y-2">
                  {[
                    { label: 'Email', value: advisor.email },
                    { label: 'Phone', value: advisor.phone },
                    { label: 'ID', value: advisor.id },
                    { label: 'Satisfaction', value: advisor.satisfaction ? `${advisor.satisfaction}/5.0` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-4">
                      <dt className="text-xs text-muted-foreground w-24 shrink-0">{label}</dt>
                      <dd className="text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {(advisor.specializations ?? []).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${avatarColor}18`, color: avatarColor }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total AUM', value: formatMoneyCompact(advisor.aum), sub: 'managed' },
                { label: 'YTD Return', value: formatPercent(advisor.avgReturn, 1), sub: 'avg across portfolios' },
                { label: 'Client Retention', value: '94.2%', sub: 'trailing 12 months' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* AUM Trend Chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">AUM Growth (12 Months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={aumTrend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={avatarColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={avatarColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₦${(v / 1e9).toFixed(1)}B`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
                  <Area
                    type="monotone"
                    dataKey="aum"
                    stroke={avatarColor}
                    strokeWidth={2}
                    fill="url(#aumGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Awards */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Awards & Recognition
              </h3>
              <div className="flex flex-wrap gap-3">
                {AWARDS.map((a) => (
                  <div
                    key={a.title}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: `${a.color}50`, backgroundColor: `${a.color}08`, color: a.color }}
                  >
                    <span>{a.icon}</span>
                    {a.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Portfolio ── */}
        {activeTab === 'Portfolio' && (
          <div className="space-y-6">
            {/* Client table */}
            <div className="rounded-xl border bg-card">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Client Portfolio ({clients.length})</h3>
                <p className="text-xs text-muted-foreground">Total AUM: <span className="font-mono font-semibold">{formatMoneyCompact(clients.reduce((s, c) => s + c.aum, 0))}</span></p>
              </div>
              <DataTable
                columns={clientCols}
                data={clients}
                isLoading={false}
                enableGlobalFilter
                pageSize={8}
                emptyMessage="No clients found"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset allocation pie */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4">Combined Asset Allocation</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}%`}
                      labelLine={false}
                    >
                      {allocationData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 5 clients */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4">Top 5 Clients by AUM</h3>
                <div className="space-y-3">
                  {top5Clients.map((c, i) => {
                    const pct = clients.length > 0 ? (c.aum / clients.reduce((s, x) => s + x.aum, 0)) * 100 : 0;
                    return (
                      <div key={c.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.clientName}</span>
                          <span className="font-mono text-xs">{formatMoneyCompact(c.aum)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Schedule ── */}
        {activeTab === 'Schedule' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Upcoming Reviews</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Next 30 days</p>
              </div>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                Schedule Review
              </button>
            </div>

            <div className="space-y-3">
              {schedule.map((s) => {
                const reviewDate = new Date(s.dateTime);
                const isOverdue = s.status === 'OVERDUE';
                const isSoon = !isOverdue && reviewDate.getTime() - Date.now() < 2 * 24 * 3600 * 1000;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'rounded-xl border bg-card p-4 flex items-start gap-4',
                      isOverdue && 'border-red-200 dark:border-red-800',
                      isSoon && 'border-amber-200 dark:border-amber-800',
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white shrink-0 text-xs font-bold', isOverdue ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-primary')}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{s.clientName}</p>
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0', SCHEDULE_STATUS_STYLES[s.status])}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{s.planCode}</span> · {s.reviewType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reviewDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {reviewDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Review Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Schedule Review</h2>
              <button onClick={() => setShowScheduleModal(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); setShowScheduleModal(false); }}
            >
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Client *</label>
                <select required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.clientName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Review Type *</label>
                <select required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {['ANNUAL_REVIEW', 'QUARTERLY_UPDATE', 'REBALANCING', 'ONBOARDING', 'AD_HOC'].map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Date & Time *</label>
                <input required type="datetime-local" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Notes</label>
                <textarea rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
