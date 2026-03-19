import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import {
  useDiscountSchemes,
  useSpecialPricingAgreements,
  useDiscountUtilization,
  useCreateDiscountScheme,
  useEvaluateDiscount,
  useCreateSpecialPricing,
  useReviewSpecialPricing,
} from '../hooks/useAgreementsExt';
import type { DiscountScheme, SpecialPricingAgreement, CreateDiscountSchemePayload, CreateSpecialPricingPayload } from '../types/agreementExt';

type Tab = 'discounts' | 'special' | 'evaluate';

const TABS: { key: Tab; label: string }[] = [
  { key: 'discounts', label: 'Discount Schemes' },
  { key: 'special', label: 'Special Pricing Agreements' },
  { key: 'evaluate', label: 'Discount Evaluation Tool' },
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#6b7280'];

function UtilizationBar({ current, max }: { current: number; max: number | null }) {
  if (!max || max === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (current / max) * 100;
  const color = pct < 50 ? 'bg-green-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono w-12 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export function PricingDashboardPage() {
  useEffect(() => { document.title = 'Pricing & Discounts | CBS'; }, []);
  const [tab, setTab] = useState<Tab>('discounts');
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const [showCreatePricing, setShowCreatePricing] = useState(false);

  // Data
  const { data: schemes = [], isLoading: schemesLoading } = useDiscountSchemes();
  const { data: specialPricing = [], isLoading: spLoading } = useSpecialPricingAgreements();
  const { data: utilization = [] } = useDiscountUtilization();
  const createDiscount = useCreateDiscountScheme();
  const createPricing = useCreateSpecialPricing();
  const reviewPricing = useReviewSpecialPricing();
  const evaluateDiscount = useEvaluateDiscount();

  // Eval state
  const [evalCustomerId, setEvalCustomerId] = useState('');
  const [evalFeeCode, setEvalFeeCode] = useState('');
  const [evalAmount, setEvalAmount] = useState('');

  // Discount create form
  const [dcForm, setDcForm] = useState<Partial<CreateDiscountSchemePayload>>({
    schemeType: 'VOLUME', discountBasis: 'PERCENTAGE', combinableWithOtherDiscounts: false,
  });

  // Special pricing create form
  const [spForm, setSpForm] = useState<Partial<CreateSpecialPricingPayload>>({
    agreementType: 'RELATIONSHIP', reviewFrequency: 'QUARTERLY',
  });

  // Stats
  const activeSchemes = schemes.filter(s => s.status === 'ACTIVE').length;
  const exhaustedSchemes = schemes.filter(s => s.maxTotalBudget && s.currentUtilization >= s.maxTotalBudget).length;
  const totalBudget = schemes.reduce((s, d) => s + (d.maxTotalBudget ?? 0), 0);

  // Overdue reviews
  const today = new Date().toISOString().split('T')[0];
  const overdueReviews = specialPricing.filter(sp => sp.nextReviewDate && sp.nextReviewDate < today);

  // Pie data
  const pieData = [
    { name: 'Active', value: schemes.filter(s => s.status === 'ACTIVE').length },
    { name: 'Exhausted', value: exhaustedSchemes },
    { name: 'Draft', value: schemes.filter(s => s.status === 'DRAFT').length },
  ].filter(d => d.value > 0);

  const handleCreateDiscount = () => {
    createDiscount.mutate(dcForm as CreateDiscountSchemePayload, {
      onSuccess: () => { setShowCreateDiscount(false); setDcForm({ schemeType: 'VOLUME', discountBasis: 'PERCENTAGE', combinableWithOtherDiscounts: false }); },
    });
  };

  const handleCreatePricing = () => {
    createPricing.mutate(spForm as CreateSpecialPricingPayload, {
      onSuccess: () => { setShowCreatePricing(false); setSpForm({ agreementType: 'RELATIONSHIP', reviewFrequency: 'QUARTERLY' }); },
    });
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Pricing & Discounts" subtitle="Manage discount schemes, special pricing agreements, and fee evaluations"
        actions={
          tab === 'discounts' ? (
            <button onClick={() => setShowCreateDiscount(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Discount Scheme
            </button>
          ) : tab === 'special' ? (
            <button onClick={() => setShowCreatePricing(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Special Pricing
            </button>
          ) : null
        }
      />

      <div className="page-container space-y-6">
        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Discount Schemes Tab ─────────────────────────────────────────── */}
        {tab === 'discounts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Schemes" value={schemes.length} format="number" loading={schemesLoading} />
              <StatCard label="Active" value={activeSchemes} format="number" loading={schemesLoading} />
              <StatCard label="Exhausted" value={exhaustedSchemes} format="number" loading={schemesLoading} />
              <StatCard label="Total Budget" value={totalBudget} format="money" loading={schemesLoading} />
            </div>

            <div className="bg-card rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Basis</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Products</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Budget</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-40">Utilization</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schemes.map(s => (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{s.schemeCode}</td>
                      <td className="px-4 py-3 font-medium">{s.schemeName}</td>
                      <td className="px-4 py-3 text-xs">{s.schemeType}</td>
                      <td className="px-4 py-3 text-xs">{s.discountBasis}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.discountBasis === 'PERCENTAGE' ? formatPercent(s.discountValue) : formatMoney(s.discountValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(s.applicableProducts || []).slice(0, 3).map(p => (
                            <span key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                          {(s.applicableProducts || []).length > 3 && <span className="text-xs text-muted-foreground">+{(s.applicableProducts || []).length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{s.maxTotalBudget ? formatMoney(s.maxTotalBudget) : '—'}</td>
                      <td className="px-4 py-3"><UtilizationBar current={s.currentUtilization} max={s.maxTotalBudget} /></td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                  {schemes.length === 0 && !schemesLoading && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No discount schemes found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Special Pricing Tab ──────────────────────────────────────────── */}
        {tab === 'special' && (
          <div className="space-y-6">
            {overdueReviews.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Overdue Reviews ({overdueReviews.length})</h3>
                </div>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {overdueReviews.map(sp => (
                    <li key={sp.id}>• <strong>{sp.customerName}</strong> ({sp.agreementCode}) — review due {sp.nextReviewDate}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-card rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negotiated By</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">FX Margin</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Free Txns</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Waived Fees</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Review</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {specialPricing.map(sp => {
                    const overdue = sp.nextReviewDate && sp.nextReviewDate < today;
                    return (
                      <tr key={sp.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-mono text-xs">{sp.agreementCode}</td>
                        <td className="px-4 py-3"><div className="font-medium">{sp.customerName}</div><div className="text-xs text-muted-foreground">#{sp.customerId}</div></td>
                        <td className="px-4 py-3 text-xs">{sp.agreementType}</td>
                        <td className="px-4 py-3 text-xs">{sp.negotiatedBy || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{sp.fxMarginOverride != null ? `${Number(sp.fxMarginOverride).toFixed(4)}` : '—'}</td>
                        <td className="px-4 py-3 text-right">{sp.freeTransactionAllowance ?? '—'}</td>
                        <td className="px-4 py-3">
                          {sp.waivedFees?.length ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{sp.waivedFees.length} fees</span>
                          ) : '—'}
                        </td>
                        <td className={cn('px-4 py-3 text-xs', overdue && 'text-red-600 dark:text-red-400 font-semibold')}>
                          {sp.nextReviewDate ? formatDate(sp.nextReviewDate) : '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={sp.status} /></td>
                        <td className="px-4 py-3 text-center">
                          {sp.status === 'ACTIVE' && (
                            <button onClick={() => reviewPricing.mutate(sp.id)}
                              disabled={reviewPricing.isPending}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {specialPricing.length === 0 && !spLoading && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No special pricing agreements found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Evaluation Tool Tab ──────────────────────────────────────────── */}
        {tab === 'evaluate' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Eval form */}
              <div className="bg-card rounded-lg border p-6 space-y-4">
                <h3 className="text-sm font-semibold">Test Discount Eligibility</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
                    <input type="number" value={evalCustomerId} onChange={e => setEvalCustomerId(e.target.value)} placeholder="e.g. 1001" className={fc} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fee Code</label>
                    <input value={evalFeeCode} onChange={e => setEvalFeeCode(e.target.value)} placeholder="e.g. TXN_FEE" className={fc} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Amount</label>
                    <input type="number" value={evalAmount} onChange={e => setEvalAmount(e.target.value)} placeholder="50000" className={fc} />
                  </div>
                </div>
                <button onClick={() => evaluateDiscount.mutate({ customerId: Number(evalCustomerId), feeCode: evalFeeCode, amount: Number(evalAmount) })}
                  disabled={!evalCustomerId || !evalFeeCode || !evalAmount || evaluateDiscount.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {evaluateDiscount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Evaluate
                </button>

                {evaluateDiscount.data && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900/40 p-4 space-y-2">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm font-semibold text-green-700 dark:text-green-400">Discount Found!</span></div>
                    <div className="text-sm space-y-1">
                      <p>Scheme: <strong>{evaluateDiscount.data.schemeName}</strong> ({evaluateDiscount.data.schemeCode})</p>
                      <p>Type: {evaluateDiscount.data.schemeType} · Basis: {evaluateDiscount.data.discountBasis}</p>
                      <p>Value: {evaluateDiscount.data.discountBasis === 'PERCENTAGE' ? formatPercent(evaluateDiscount.data.discountValue) : formatMoney(evaluateDiscount.data.discountValue)}</p>
                    </div>
                  </div>
                )}
                {evaluateDiscount.isError && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No applicable discount found for this combination.</div>
                )}
              </div>

              {/* Pie chart */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-sm font-semibold mb-4">Scheme Distribution</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-12">No scheme data available.</div>
                )}
              </div>
            </div>

            {/* Utilization table */}
            <div className="bg-card rounded-lg border">
              <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Active Discount Utilization</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheme</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Priority</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Budget</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Used</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground w-40">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {utilization.filter(u => u.status === 'ACTIVE').sort((a, b) => (a.priorityOrder ?? 99) - (b.priorityOrder ?? 99)).map(u => (
                      <tr key={u.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{u.schemeName} <span className="text-xs text-muted-foreground font-mono">({u.schemeCode})</span></td>
                        <td className="px-4 py-3 text-right font-mono">{u.priorityOrder ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{u.maxTotalBudget ? formatMoney(u.maxTotalBudget) : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(u.currentUtilization)}</td>
                        <td className="px-4 py-3"><UtilizationBar current={u.currentUtilization} max={u.maxTotalBudget} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Discount Dialog ──────────────────────────────────────────── */}
      {showCreateDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateDiscount(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">New Discount Scheme</h2>
              <button onClick={() => setShowCreateDiscount(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Scheme Name *</label>
                  <input value={dcForm.schemeName || ''} onChange={e => setDcForm(p => ({ ...p, schemeName: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select value={dcForm.schemeType} onChange={e => setDcForm(p => ({ ...p, schemeType: e.target.value }))} className={fc}>
                    {['VOLUME', 'LOYALTY', 'PROMOTIONAL', 'RELATIONSHIP'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Discount Basis</label>
                  <select value={dcForm.discountBasis} onChange={e => setDcForm(p => ({ ...p, discountBasis: e.target.value }))} className={fc}>
                    {['PERCENTAGE', 'FLAT_AMOUNT', 'TIERED'].map(b => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Discount Value *</label>
                  <input type="number" step="0.01" value={dcForm.discountValue ?? ''} onChange={e => setDcForm(p => ({ ...p, discountValue: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <input type="number" value={dcForm.priorityOrder ?? ''} onChange={e => setDcForm(p => ({ ...p, priorityOrder: Number(e.target.value) }))} className={fc} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Products (comma-separated)</label>
                  <input value={(dcForm.applicableProducts || []).join(', ')} onChange={e => setDcForm(p => ({ ...p, applicableProducts: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Segments</label>
                  <input value={(dcForm.applicableSegments || []).join(', ')} onChange={e => setDcForm(p => ({ ...p, applicableSegments: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="RETAIL, CORPORATE" className={fc} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Max Discount Amount</label>
                  <input type="number" value={dcForm.maxDiscountAmount ?? ''} onChange={e => setDcForm(p => ({ ...p, maxDiscountAmount: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Max Usage/Customer</label>
                  <input type="number" value={dcForm.maxUsagePerCustomer ?? ''} onChange={e => setDcForm(p => ({ ...p, maxUsagePerCustomer: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Max Total Budget</label>
                  <input type="number" value={dcForm.maxTotalBudget ?? ''} onChange={e => setDcForm(p => ({ ...p, maxTotalBudget: Number(e.target.value) }))} className={fc} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective From</label>
                  <input type="date" value={dcForm.effectiveFrom ?? ''} onChange={e => setDcForm(p => ({ ...p, effectiveFrom: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective To</label>
                  <input type="date" value={dcForm.effectiveTo ?? ''} onChange={e => setDcForm(p => ({ ...p, effectiveTo: e.target.value }))} className={fc} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={dcForm.combinableWithOtherDiscounts} onChange={e => setDcForm(p => ({ ...p, combinableWithOtherDiscounts: e.target.checked }))} className="rounded" /> Combinable with other discounts</label>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setShowCreateDiscount(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleCreateDiscount} disabled={createDiscount.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {createDiscount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Special Pricing Dialog ───────────────────────────────────── */}
      {showCreatePricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreatePricing(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">New Special Pricing Agreement</h2>
              <button onClick={() => setShowCreatePricing(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                  <input type="number" value={spForm.customerId ?? ''} onChange={e => setSpForm(p => ({ ...p, customerId: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer Name *</label>
                  <input value={spForm.customerName ?? ''} onChange={e => setSpForm(p => ({ ...p, customerName: e.target.value }))} className={fc} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Agreement Type</label>
                  <select value={spForm.agreementType} onChange={e => setSpForm(p => ({ ...p, agreementType: e.target.value }))} className={fc}>
                    {['RELATIONSHIP', 'VOLUME', 'STRATEGIC', 'STAFF'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Negotiated By</label>
                  <input value={spForm.negotiatedBy ?? ''} onChange={e => setSpForm(p => ({ ...p, negotiatedBy: e.target.value }))} className={fc} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">FX Margin Override</label>
                  <input type="number" step="0.0001" value={spForm.fxMarginOverride ?? ''} onChange={e => setSpForm(p => ({ ...p, fxMarginOverride: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Free Txn Allowance</label>
                  <input type="number" value={spForm.freeTransactionAllowance ?? ''} onChange={e => setSpForm(p => ({ ...p, freeTransactionAllowance: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Relationship Value</label>
                  <input type="number" value={spForm.relationshipValueAtApproval ?? ''} onChange={e => setSpForm(p => ({ ...p, relationshipValueAtApproval: Number(e.target.value) }))} className={fc} /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Waived Fees (comma-separated)</label>
                <input value={(spForm.waivedFees || []).join(', ')} onChange={e => setSpForm(p => ({ ...p, waivedFees: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="ATM_FEE, CARD_FEE" className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Conditions</label>
                <textarea value={spForm.conditions ?? ''} onChange={e => setSpForm(p => ({ ...p, conditions: e.target.value }))} rows={3} className={fc} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Review Frequency</label>
                  <select value={spForm.reviewFrequency ?? ''} onChange={e => setSpForm(p => ({ ...p, reviewFrequency: e.target.value }))} className={fc}>
                    {['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Next Review Date</label>
                  <input type="date" value={spForm.nextReviewDate ?? ''} onChange={e => setSpForm(p => ({ ...p, nextReviewDate: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Effective From</label>
                  <input type="date" value={spForm.effectiveFrom ?? ''} onChange={e => setSpForm(p => ({ ...p, effectiveFrom: e.target.value }))} className={fc} /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setShowCreatePricing(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleCreatePricing} disabled={createPricing.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {createPricing.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
