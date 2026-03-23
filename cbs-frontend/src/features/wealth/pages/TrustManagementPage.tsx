import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard } from '@/components/shared';
import { apiGet, apiPost } from '@/lib/api';
import { formatMoney, formatDate, formatMoneyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, X, Plus } from 'lucide-react';
import { TrustAnalyticsSection } from '../components/trusts/TrustAnalyticsSection';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrustAccount {
  id: string;
  trustCode: string;
  trustName: string;
  trustType: string;
  grantorCustomerId: string;
  trusteeType: string;
  trusteeName: string;
  currency: string;
  corpusValue: number;
  incomeYtd: number;
  distributionsYtd: number;
  beneficiaries: Array<{
    id: string;
    name: string;
    relationship: string;
    sharePercent: number;
    contactInfo: string;
  }>;
  distributionRules: Record<string, string>;
  investmentPolicy: string;
  annualFeePct: number;
  taxId: string;
  inceptionDate: string;
  terminationDate?: string;
  status: string;
}

interface TrustFormData {
  trustName: string;
  trustType: string;
  grantorCustomerId: string;
  trusteeType: string;
  trusteeName: string;
  currency: string;
  corpusValue: string;
  investmentPolicy: string;
  inceptionDate: string;
  annualFeePct: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  REVOCABLE: '#10b981',
  IRREVOCABLE: '#3b82f6',
  TESTAMENTARY: '#f59e0b',
  CHARITABLE: '#8b5cf6',
  BUSINESS_TRUST: '#ef4444',
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

const BLANK_FORM: TrustFormData = {
  trustName: '',
  trustType: 'REVOCABLE',
  grantorCustomerId: '',
  trusteeType: 'INDIVIDUAL',
  trusteeName: '',
  currency: 'NGN',
  corpusValue: '',
  investmentPolicy: '',
  inceptionDate: '',
  annualFeePct: '',
};

// ─── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(): ColumnDef<TrustAccount, unknown>[] {
  return [
    {
      accessorKey: 'trustCode',
      header: 'Trust Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.trustCode}</span>
      ),
    },
    {
      accessorKey: 'trustName',
      header: 'Trust Name',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.trustName}</span>,
    },
    {
      accessorKey: 'trustType',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${TYPE_COLORS[row.original.trustType] || '#6b7280'}20`,
            color: TYPE_COLORS[row.original.trustType] || '#6b7280',
          }}
        >
          {row.original.trustType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'grantorCustomerId',
      header: 'Grantor',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {String(row.original.grantorCustomerId).slice(0, 8)}
        </span>
      ),
    },
    { accessorKey: 'trusteeName', header: 'Trustee Name' },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.currency}</span>
      ),
    },
    {
      accessorKey: 'corpusValue',
      header: 'Corpus Value',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-bold">{formatMoney(row.original.corpusValue, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'incomeYtd',
      header: 'YTD Income',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-green-600 dark:text-green-400">{formatMoney(row.original.incomeYtd, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'distributionsYtd',
      header: 'YTD Distributions',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.distributionsYtd, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'inceptionDate',
      header: 'Inception Date',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.inceptionDate)}</span>,
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TrustManagementPage() {
  const navigate = useNavigate();
  const [trusts, setTrusts] = useState<TrustAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TrustFormData>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);

  const columns = buildColumns();

  useEffect(() => {
    setLoading(true);
    apiGet<TrustAccount[]>('/api/v1/trusts')
      .then(setTrusts)
      .catch(() => setTrusts([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──
  const totalCorpus = trusts.reduce((s, t) => s + (t.corpusValue || 0), 0);
  const activeTrusts = trusts.filter((t) => t.status === 'ACTIVE').length;
  const pendingTrusts = trusts.filter((t) => t.status === 'PENDING').length;
  const ytdDistributions = trusts.reduce((s, t) => s + (t.distributionsYtd || 0), 0);

  // ── Pie chart data ──
  const typeBreakdown = Object.entries(
    trusts.reduce<Record<string, number>>((acc, t) => {
      acc[t.trustType] = (acc[t.trustType] || 0) + (t.corpusValue || 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  // ── Form submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/v1/trusts', {
        ...form,
        grantorCustomerId: parseInt(form.grantorCustomerId, 10) || 0,
        corpusValue: parseFloat(form.corpusValue) || 0,
        annualFeePct: parseFloat(form.annualFeePct) || 0,
      });
      const fresh = await apiGet<TrustAccount[]>('/api/v1/trusts').catch(() => trusts);
      setTrusts(fresh);
      setShowModal(false);
      setForm(BLANK_FORM);
    } catch {
      // swallow; could show toast
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Trust Services"
        subtitle="Manage trusts, beneficiaries, and distributions"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trust
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Trusts" value={trusts.length} format="number" icon={Shield} loading={loading} />
          <StatCard label="Total Corpus" value={totalCorpus} format="money" compact loading={loading} />
          <StatCard label="Active Trusts" value={activeTrusts} format="number" loading={loading} />
          <StatCard label="YTD Distributions" value={ytdDistributions} format="money" compact loading={loading} />
          <StatCard label="Pending Trusts" value={pendingTrusts} format="number" loading={loading} />
        </div>

        {/* Charts + Table layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Donut chart */}
          <div className="lg:col-span-1 surface-card p-5">
            <h3 className="text-sm font-semibold mb-4">Trust Type Breakdown</h3>
            {typeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            )}
          </div>

          {/* Table */}
          <div className="lg:col-span-3 surface-card">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold">All Trust Accounts</h3>
            </div>
            <DataTable
              columns={columns}
              data={trusts}
              isLoading={loading}
              onRowClick={(row) => navigate(`/wealth/trusts/${row.trustCode}`)}
              enableGlobalFilter
              pageSize={10}
              emptyMessage="No trust accounts found"
            />
          </div>
        </div>
      </div>

      {/* Trust Analytics */}
      <div className="page-container">
        <TrustAnalyticsSection />
      </div>

      {/* Create Trust Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-2xl surface-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Create New Trust</h2>
              <button
                onClick={() => { setShowModal(false); setForm(BLANK_FORM); }}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trust Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Trust Name *</label>
                  <input
                    required
                    type="text"
                    value={form.trustName}
                    onChange={(e) => setForm((f) => ({ ...f, trustName: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. The Okonkwo Family Trust"
                  />
                </div>

                {/* Trust Type */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Trust Type *</label>
                  <select
                    required
                    value={form.trustType}
                    onChange={(e) => setForm((f) => ({ ...f, trustType: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="REVOCABLE">Revocable</option>
                    <option value="IRREVOCABLE">Irrevocable</option>
                    <option value="TESTAMENTARY">Testamentary</option>
                    <option value="CHARITABLE">Charitable</option>
                    <option value="BUSINESS_TRUST">Business Trust</option>
                  </select>
                </div>

                {/* Grantor Customer ID */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Grantor Customer ID *</label>
                  <input
                    required
                    type="text"
                    value={form.grantorCustomerId}
                    onChange={(e) => setForm((f) => ({ ...f, grantorCustomerId: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Customer ID"
                  />
                </div>

                {/* Trustee Type */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Trustee Type *</label>
                  <select
                    required
                    value={form.trusteeType}
                    onChange={(e) => setForm((f) => ({ ...f, trusteeType: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="BANK">Bank</option>
                  </select>
                </div>

                {/* Trustee Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Trustee Name *</label>
                  <input
                    required
                    type="text"
                    value={form.trusteeName}
                    onChange={(e) => setForm((f) => ({ ...f, trusteeName: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Full legal name"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Currency *</label>
                  <select
                    required
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                {/* Corpus Value */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Corpus Value *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.corpusValue}
                    onChange={(e) => setForm((f) => ({ ...f, corpusValue: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                {/* Annual Fee % */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Annual Fee %</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.01}
                    value={form.annualFeePct}
                    onChange={(e) => setForm((f) => ({ ...f, annualFeePct: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00 – 5.00"
                  />
                </div>

                {/* Inception Date */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Inception Date *</label>
                  <input
                    required
                    type="date"
                    value={form.inceptionDate}
                    onChange={(e) => setForm((f) => ({ ...f, inceptionDate: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Investment Policy */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Investment Policy</label>
                  <textarea
                    rows={3}
                    value={form.investmentPolicy}
                    onChange={(e) => setForm((f) => ({ ...f, investmentPolicy: e.target.value }))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Describe investment objectives and constraints..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(BLANK_FORM); }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                    submitting && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {submitting ? 'Creating...' : 'Create Trust'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
