import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { apiGet, apiPost } from '@/lib/api';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart,
  Bar,
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
import {
  X,
  Plus,
  Download,
  Upload,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  sharePercent: number;
  contactInfo: string;
}

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
  beneficiaries: Beneficiary[];
  distributionRules: Record<string, string>;
  investmentPolicy: string;
  annualFeePct: number;
  taxId: string;
  inceptionDate: string;
  terminationDate?: string;
  status: string;
}

interface DistributionRecord {
  id: string;
  date: string;
  amount: number;
  beneficiary: string;
  type: string;
  approvedBy: string;
  notes?: string;
}

interface MockDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  uploadedBy: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Beneficiaries', 'Distributions', 'Documents'] as const;
type Tab = (typeof TABS)[number];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const MOCK_DOCUMENTS: MockDocument[] = [
  { id: '1', name: 'Trust Deed', type: 'Legal', uploadDate: '2022-01-15', uploadedBy: 'Compliance' },
  { id: '2', name: 'Investment Policy Statement', type: 'Policy', uploadDate: '2022-01-20', uploadedBy: 'Wealth Desk' },
  { id: '3', name: 'Beneficiary Designations', type: 'Legal', uploadDate: '2022-02-01', uploadedBy: 'Trust Officer' },
  { id: '4', name: 'Annual Report 2024', type: 'Report', uploadDate: '2025-02-10', uploadedBy: 'Reporting' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMonthlyDistributions(records: DistributionRecord[]) {
  const now = new Date();
  const map: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    map[key] = 0;
  }
  records.forEach((r) => {
    const d = new Date(r.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (key in map) map[key] += r.amount;
  });
  return Object.entries(map).map(([month, amount]) => ({ month: month.split(' ')[0], amount }));
}

// ─── Distribution table columns ───────────────────────────────────────────────

const distColumns: ColumnDef<DistributionRecord, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{formatMoney(row.original.amount)}</span>
    ),
  },
  { accessorKey: 'beneficiary', header: 'Beneficiary' },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.type} />,
  },
  { accessorKey: 'approvedBy', header: 'Approved By' },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.notes || '—'}</span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TrustDetailPage() {
  const { code } = useParams<{ code: string }>();

  const [trust, setTrust] = useState<TrustAccount | null>(null);
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  // Distribution modal state
  const [showDistModal, setShowDistModal] = useState(false);
  const [distForm, setDistForm] = useState({ amount: '', beneficiary: '', type: 'INCOME', notes: '' });
  const [distSubmitting, setDistSubmitting] = useState(false);

  // Beneficiary form state
  const [showBenefForm, setShowBenefForm] = useState(false);
  const [benefForm, setBenefForm] = useState({ name: '', relationship: 'CHILD', sharePercent: '', contactInfo: '' });

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    Promise.all([
      apiGet<TrustAccount>(`/api/v1/trusts/${code}`),
      apiGet<DistributionRecord[]>(`/api/v1/trusts/${code}/distributions`),
    ]).then(([t, d]) => {
      setTrust(t);
      setDistributions(d);
    }).finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trust) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Trust account not found</p>
      </div>
    );
  }

  const netCorpus = trust.corpusValue - trust.distributionsYtd;
  const monthlyData = buildMonthlyDistributions(distributions);
  const totalDistributed = distributions.reduce((s, d) => s + d.amount, 0);
  const lastDistDate = distributions.length > 0
    ? distributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
    : null;

  // ── Distribution submit ──
  async function handleDistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    setDistSubmitting(true);
    try {
      await apiPost(`/api/v1/trusts/${code}/distribute`, {
        amount: parseFloat(distForm.amount),
        beneficiary: distForm.beneficiary,
        type: distForm.type,
        notes: distForm.notes,
      });
      const fresh = await apiGet<DistributionRecord[]>(`/api/v1/trusts/${code}/distributions`).catch(() => distributions);
      setDistributions(fresh);
      setShowDistModal(false);
      setDistForm({ amount: '', beneficiary: '', type: 'INCOME', notes: '' });
    } catch {
      // swallow
    } finally {
      setDistSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={trust.trustName}
        subtitle={`Trust Account · ${trust.trustCode}`}
        backTo="/wealth/trusts"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={trust.status} size="md" dot />
            <button
              onClick={() => setShowDistModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Distribution
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
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

        {/* ── Tab: Overview ── */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* Financial stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Corpus Value', value: formatMoney(trust.corpusValue, trust.currency), className: 'text-2xl font-bold' },
                { label: 'YTD Income', value: formatMoney(trust.incomeYtd, trust.currency), className: 'text-2xl font-bold text-green-600 dark:text-green-400' },
                { label: 'YTD Distributions', value: formatMoney(trust.distributionsYtd, trust.currency), className: 'text-2xl font-bold' },
                { label: 'Net Corpus', value: formatMoney(netCorpus, trust.currency), className: 'text-2xl font-bold text-primary' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-5">
                  <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
                  <p className={cn('font-mono break-all', s.className)}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Trust details grid */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold mb-4">Trust Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                {[
                  { label: 'Trust Code', value: trust.trustCode },
                  { label: 'Type', value: trust.trustType.replace(/_/g, ' ') },
                  { label: 'Status', value: trust.status },
                  { label: 'Trustee', value: trust.trusteeName },
                  { label: 'Trustee Type', value: trust.trusteeType },
                  { label: 'Currency', value: trust.currency },
                  { label: 'Annual Fee %', value: `${trust.annualFeePct ?? 0}%` },
                  { label: 'Tax ID', value: trust.taxId || '—' },
                  { label: 'Inception Date', value: formatDate(trust.inceptionDate) },
                  { label: 'Termination Date', value: trust.terminationDate ? formatDate(trust.terminationDate) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Policy */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold mb-3">Investment Policy</h3>
              <textarea
                readOnly
                value={trust.investmentPolicy || 'No investment policy on file.'}
                rows={4}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground resize-none focus:outline-none"
              />
            </div>

            {/* Distribution Rules */}
            {trust.distributionRules && Object.keys(trust.distributionRules).length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-sm font-semibold mb-3">Distribution Rules</h3>
                <dl className="space-y-2">
                  {Object.entries(trust.distributionRules).map(([k, v]) => (
                    <div key={k} className="flex gap-4">
                      <dt className="text-xs font-medium text-muted-foreground w-40 shrink-0 capitalize">{k.replace(/_/g, ' ')}</dt>
                      <dd className="text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Beneficiaries ── */}
        {activeTab === 'Beneficiaries' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Beneficiary list */}
              <div className="lg:col-span-2 rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Beneficiaries</h3>
                  <button
                    onClick={() => setShowBenefForm(!showBenefForm)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Beneficiary
                  </button>
                </div>

                {/* Inline add form */}
                {showBenefForm && (
                  <div className="mb-4 rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Name</label>
                        <input
                          type="text"
                          value={benefForm.name}
                          onChange={(e) => setBenefForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Relationship</label>
                        <select
                          value={benefForm.relationship}
                          onChange={(e) => setBenefForm((f) => ({ ...f, relationship: e.target.value }))}
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'CHARITY', 'OTHER'].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Share %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={benefForm.sharePercent}
                          onChange={(e) => setBenefForm((f) => ({ ...f, sharePercent: e.target.value }))}
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Contact Info</label>
                        <input
                          type="text"
                          value={benefForm.contactInfo}
                          onChange={(e) => setBenefForm((f) => ({ ...f, contactInfo: e.target.value }))}
                          className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBenefForm(false)}
                        className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Beneficiary rows */}
                <div className="space-y-3">
                  {(trust.beneficiaries ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No beneficiaries on record</p>
                  ) : (
                    (trust.beneficiaries ?? []).map((b, i) => (
                      <div key={b.id} className="rounded-lg border bg-muted/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.relationship} · {b.contactInfo}</p>
                          </div>
                          <span className="font-mono text-sm font-bold">{b.sharePercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${b.sharePercent}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Beneficiary Pie Chart */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold mb-4">Allocation</h3>
                {(trust.beneficiaries ?? []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={(trust.beneficiaries ?? []).map((b) => ({ name: b.name, value: b.sharePercent }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${value}%`}
                        labelLine={false}
                      >
                        {(trust.beneficiaries ?? []).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Distributions ── */}
        {activeTab === 'Distributions' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Distributed', value: formatMoney(totalDistributed, trust.currency) },
                { label: 'Count', value: distributions.length.toString() },
                { label: 'Avg Distribution', value: distributions.length > 0 ? formatMoney(totalDistributed / distributions.length, trust.currency) : '—' },
                { label: 'Last Distribution', value: lastDistDate ? formatDate(lastDistDate) : '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-lg font-bold font-mono">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Monthly chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Monthly Distribution (12 months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatMoney(v, trust.currency)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card">
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-sm font-semibold">Distribution History</h3>
              </div>
              <DataTable
                columns={distColumns}
                data={distributions}
                isLoading={false}
                enableGlobalFilter
                pageSize={10}
                emptyMessage="No distributions recorded"
              />
            </div>
          </div>
        )}

        {/* ── Tab: Documents ── */}
        {activeTab === 'Documents' && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <Upload className="w-4 h-4" />
                Upload Document
                <input type="file" className="hidden" />
              </label>
            </div>
            <div className="rounded-xl border bg-card divide-y">
              {MOCK_DOCUMENTS.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} · Uploaded {formatDate(doc.uploadDate)} by {doc.uploadedBy}</p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Record Distribution Modal */}
      {showDistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Record Distribution</h2>
              <button
                onClick={() => setShowDistModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDistSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Amount ({trust.currency}) *</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={distForm.amount}
                  onChange={(e) => setDistForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Beneficiary *</label>
                <select
                  required
                  value={distForm.beneficiary}
                  onChange={(e) => setDistForm((f) => ({ ...f, beneficiary: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select beneficiary...</option>
                  {(trust.beneficiaries ?? []).map((b) => (
                    <option key={b.id} value={b.name}>{b.name} ({b.sharePercent}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Distribution Type *</label>
                <select
                  required
                  value={distForm.type}
                  onChange={(e) => setDistForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="INCOME">Income</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="CHARITABLE">Charitable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Notes</label>
                <textarea
                  rows={3}
                  value={distForm.notes}
                  onChange={(e) => setDistForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowDistModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={distSubmitting}
                  className={cn(
                    'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90',
                    distSubmitting && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {distSubmitting ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
