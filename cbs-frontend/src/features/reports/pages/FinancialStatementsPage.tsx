import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  FileBarChart2,
  CheckCircle2,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FinancialStatement {
  id: number;
  statementCode: string;
  customerId: number;
  statementType: string;
  reportingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  totalRevenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  auditorName: string;
  auditOpinion: string;
  sourceDocumentRef: string;
  notes: string;
  status: string;
}

interface StatementRatio {
  id: number;
  statementId: number;
  ratioCategory: string;
  ratioName: string;
  ratioValue: number;
  benchmarkValue: number | null;
  rating: string;
  createdAt: string;
}

type CreateStatementPayload = Omit<FinancialStatement, 'id' | 'statementCode' | 'status'>;

// ─── API ────────────────────────────────────────────────────────────────────

function fetchStatements(customerId: number) {
  return apiGet<FinancialStatement[]>(`/api/v1/financial-statements/customer/${customerId}`);
}

function fetchRatios(code: string) {
  return apiGet<StatementRatio[]>(`/api/v1/financial-statements/${code}/ratios`);
}

function createStatement(payload: CreateStatementPayload) {
  return apiPost<FinancialStatement>('/api/v1/financial-statements', payload);
}

function approveStatement(code: string) {
  return apiPost<FinancialStatement>(`/api/v1/financial-statements/${code}/approve`);
}

function calculateRatios(code: string) {
  return apiPost<StatementRatio[]>(`/api/v1/financial-statements/${code}/calculate-ratios`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATEMENT_TYPES = ['ANNUAL', 'INTERIM', 'QUARTERLY'] as const;
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'] as const;
const AUDIT_OPINIONS = ['UNQUALIFIED', 'QUALIFIED', 'ADVERSE', 'DISCLAIMER'] as const;

const RATIO_CATEGORIES = ['LIQUIDITY', 'PROFITABILITY', 'LEVERAGE', 'EFFICIENCY', 'COVERAGE'] as const;

function opinionColor(opinion: string) {
  switch (opinion) {
    case 'UNQUALIFIED': return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'QUALIFIED': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'ADVERSE': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'DISCLAIMER': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function ratingColor(rating: string) {
  switch (rating) {
    case 'STRONG': return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'ADEQUATE': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'WEAK': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function ratingBarColor(rating: string) {
  switch (rating) {
    case 'STRONG': return 'bg-green-500';
    case 'ADEQUATE': return 'bg-amber-500';
    case 'WEAK': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

function typeBadgeColor(type: string) {
  switch (type) {
    case 'ANNUAL': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'INTERIM': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'QUARTERLY': return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t">{children}</div>}
    </div>
  );
}

// ─── Money Field ────────────────────────────────────────────────────────────

function MoneyField({ label, value, currency }: { label: string; value: number | null | undefined; currency: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value != null ? formatMoney(value, currency) : '--'}</span>
    </div>
  );
}

// ─── Record Statement Dialog ────────────────────────────────────────────────

function RecordStatementDialog({
  open,
  onClose,
  defaultCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  defaultCustomerId?: number;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CreateStatementPayload>>({
    customerId: defaultCustomerId,
    currency: 'USD',
    statementType: 'ANNUAL',
    auditOpinion: 'UNQUALIFIED',
  });

  useEffect(() => {
    if (defaultCustomerId) setForm((f) => ({ ...f, customerId: defaultCustomerId }));
  }, [defaultCustomerId]);

  const mutation = useMutation({
    mutationFn: () => createStatement(form as CreateStatementPayload),
    onSuccess: () => {
      toast.success('Financial statement recorded');
      queryClient.invalidateQueries({ queryKey: ['financial-statements'] });
      onClose();
    },
    onError: () => toast.error('Failed to record statement'),
  });

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));
  const setNum = (field: string, raw: string) => {
    const v = raw === '' ? undefined : parseFloat(raw);
    set(field, v);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">Record Financial Statement</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <form
          className="p-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          {/* Basic Info */}
          <CollapsibleSection title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.customerId ?? ''}
                  onChange={(e) => setNum('customerId', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Statement Type *</label>
                <select
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.statementType ?? 'ANNUAL'}
                  onChange={(e) => set('statementType', e.target.value)}
                >
                  {STATEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reporting Period</label>
                <input
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g. FY2025"
                  value={form.reportingPeriod ?? ''}
                  onChange={(e) => set('reportingPeriod', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Currency</label>
                <select
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.currency ?? 'USD'}
                  onChange={(e) => set('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Period Start</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.periodStartDate ?? ''}
                  onChange={(e) => set('periodStartDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Period End</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.periodEndDate ?? ''}
                  onChange={(e) => set('periodEndDate', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Balance Sheet */}
          <CollapsibleSection title="Balance Sheet" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              {(['totalAssets', 'totalLiabilities', 'totalEquity', 'currentAssets', 'currentLiabilities'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                    value={((form as Record<string, unknown>)[f] as string | number) ?? ''}
                    onChange={(e) => setNum(f, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Income Statement */}
          <CollapsibleSection title="Income Statement" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              {(['totalRevenue', 'costOfRevenue', 'grossProfit', 'operatingIncome', 'netIncome', 'ebitda'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {f === 'ebitda' ? 'EBITDA' : f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                    value={((form as Record<string, unknown>)[f] as string | number) ?? ''}
                    onChange={(e) => setNum(f, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Cash Flow */}
          <CollapsibleSection title="Cash Flow" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              {(['operatingCashFlow', 'investingCashFlow', 'financingCashFlow', 'netCashFlow'] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 rounded-md border px-3 py-2 text-sm font-mono"
                    value={((form as Record<string, unknown>)[f] as string | number) ?? ''}
                    onChange={(e) => setNum(f, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Audit */}
          <CollapsibleSection title="Audit Information" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Auditor Name</label>
                <input
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.auditorName ?? ''}
                  onChange={(e) => set('auditorName', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Audit Opinion</label>
                <select
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.auditOpinion ?? 'UNQUALIFIED'}
                  onChange={(e) => set('auditOpinion', e.target.value)}
                >
                  {AUDIT_OPINIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Source Document Ref</label>
                <input
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={form.sourceDocumentRef ?? ''}
                  onChange={(e) => set('sourceDocumentRef', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Record Statement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Slide-Over ──────────────────────────────────────────────────────

function StatementDetailSlideOver({
  statement,
  onClose,
}: {
  statement: FinancialStatement;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const ccy = statement.currency;

  const ratiosQuery = useQuery({
    queryKey: ['financial-statements', statement.statementCode, 'ratios'],
    queryFn: () => fetchRatios(statement.statementCode),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveStatement(statement.statementCode),
    onSuccess: () => {
      toast.success('Statement approved');
      queryClient.invalidateQueries({ queryKey: ['financial-statements'] });
    },
    onError: () => toast.error('Failed to approve statement'),
  });

  const calcMutation = useMutation({
    mutationFn: () => calculateRatios(statement.statementCode),
    onSuccess: () => {
      toast.success('Ratios calculated');
      queryClient.invalidateQueries({ queryKey: ['financial-statements', statement.statementCode, 'ratios'] });
    },
    onError: () => toast.error('Failed to calculate ratios'),
  });

  const groupedRatios = useMemo(() => {
    if (!ratiosQuery.data) return {};
    const groups: Record<string, StatementRatio[]> = {};
    for (const r of ratiosQuery.data) {
      (groups[r.ratioCategory] ??= []).push(r);
    }
    return groups;
  }, [ratiosQuery.data]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-xl bg-background shadow-xl border-l overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold font-mono">{statement.statementCode}</h2>
            <p className="text-sm text-muted-foreground">
              {statement.statementType} &middot; {statement.reportingPeriod}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={statement.status} />
            <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Balance Sheet */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Balance Sheet</h3>
            <div className="border rounded-lg divide-y px-4">
              <MoneyField label="Total Assets" value={statement.totalAssets} currency={ccy} />
              <MoneyField label="Current Assets" value={statement.currentAssets} currency={ccy} />
              <MoneyField label="Total Liabilities" value={statement.totalLiabilities} currency={ccy} />
              <MoneyField label="Current Liabilities" value={statement.currentLiabilities} currency={ccy} />
              <MoneyField label="Total Equity" value={statement.totalEquity} currency={ccy} />
            </div>
          </section>

          {/* Income Statement */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Income Statement</h3>
            <div className="border rounded-lg divide-y px-4">
              <MoneyField label="Revenue" value={statement.totalRevenue} currency={ccy} />
              <MoneyField label="Cost of Revenue" value={statement.costOfRevenue} currency={ccy} />
              <MoneyField label="Gross Profit" value={statement.grossProfit} currency={ccy} />
              <MoneyField label="Operating Income" value={statement.operatingIncome} currency={ccy} />
              <MoneyField label="Net Income" value={statement.netIncome} currency={ccy} />
              <MoneyField label="EBITDA" value={statement.ebitda} currency={ccy} />
            </div>
          </section>

          {/* Cash Flow */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Cash Flow</h3>
            <div className="border rounded-lg divide-y px-4">
              <MoneyField label="Operating" value={statement.operatingCashFlow} currency={ccy} />
              <MoneyField label="Investing" value={statement.investingCashFlow} currency={ccy} />
              <MoneyField label="Financing" value={statement.financingCashFlow} currency={ccy} />
              <MoneyField label="Net Cash Flow" value={statement.netCashFlow} currency={ccy} />
            </div>
          </section>

          {/* Audit */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Audit Information</h3>
            <div className="border rounded-lg divide-y px-4">
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-muted-foreground">Auditor</span>
                <span className="font-medium">{statement.auditorName || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-muted-foreground">Opinion</span>
                {statement.auditOpinion ? (
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', opinionColor(statement.auditOpinion))}>
                    {statement.auditOpinion}
                  </span>
                ) : <span>--</span>}
              </div>
              <div className="flex justify-between items-center py-1.5 text-sm">
                <span className="text-muted-foreground">Source Document</span>
                <span className="font-medium truncate max-w-[200px]">{statement.sourceDocumentRef || '--'}</span>
              </div>
              {statement.notes && (
                <div className="py-2 text-sm">
                  <span className="text-muted-foreground block mb-1">Notes</span>
                  <p className="text-sm whitespace-pre-wrap">{statement.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50"
              onClick={() => calcMutation.mutate()}
              disabled={calcMutation.isPending}
            >
              {calcMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
              Calculate Ratios
            </button>
            {statement.status === 'DRAFT' && (
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
            )}
          </div>

          {/* Ratios */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Financial Ratios</h3>
            {ratiosQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading ratios...
              </div>
            ) : ratiosQuery.data && ratiosQuery.data.length > 0 ? (
              <div className="space-y-4">
                {RATIO_CATEGORIES.filter((cat) => groupedRatios[cat]).map((cat) => (
                  <div key={cat}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h4>
                    <div className="border rounded-lg divide-y">
                      {groupedRatios[cat].map((ratio) => {
                        const pct = ratio.benchmarkValue
                          ? Math.min(100, Math.max(0, (ratio.ratioValue / ratio.benchmarkValue) * 100))
                          : null;
                        return (
                          <div key={ratio.id} className="px-4 py-2.5">
                            <div className="flex items-center justify-between text-sm">
                              <span>{ratio.ratioName}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{ratio.ratioValue?.toFixed(2)}</span>
                                {ratio.benchmarkValue != null && (
                                  <span className="text-xs text-muted-foreground">
                                    / {ratio.benchmarkValue.toFixed(2)}
                                  </span>
                                )}
                                <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-medium', ratingColor(ratio.rating))}>
                                  {ratio.rating}
                                </span>
                              </div>
                            </div>
                            {pct !== null && (
                              <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', ratingBarColor(ratio.rating))}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                No ratios computed yet. Click "Calculate Ratios" above.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function FinancialStatementsPage() {
  const [customerId, setCustomerId] = useState('');
  const [loadedCustomerId, setLoadedCustomerId] = useState<number | null>(null);
  const [selected, setSelected] = useState<FinancialStatement | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    document.title = 'Financial Statements | CBS';
  }, []);

  const statementsQuery = useQuery({
    queryKey: ['financial-statements', loadedCustomerId],
    queryFn: () => fetchStatements(loadedCustomerId!),
    enabled: loadedCustomerId != null,
  });

  const handleLoad = useCallback(() => {
    const id = parseInt(customerId, 10);
    if (!isNaN(id) && id > 0) {
      setLoadedCustomerId(id);
      setSelected(null);
    } else {
      toast.error('Please enter a valid Customer ID');
    }
  }, [customerId]);

  const columns = useMemo<ColumnDef<FinancialStatement, unknown>[]>(() => [
    {
      accessorKey: 'statementCode',
      header: 'Code',
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'statementType',
      header: 'Type',
      cell: ({ getValue }) => {
        const t = getValue<string>();
        return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeBadgeColor(t))}>{t}</span>;
      },
    },
    {
      accessorKey: 'reportingPeriod',
      header: 'Period',
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
    },
    {
      accessorKey: 'totalAssets',
      header: 'Total Assets',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-right block">
          {row.original.totalAssets != null ? formatMoney(row.original.totalAssets, row.original.currency) : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'totalEquity',
      header: 'Total Equity',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-right block">
          {row.original.totalEquity != null ? formatMoney(row.original.totalEquity, row.original.currency) : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'netIncome',
      header: 'Net Income',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-right block">
          {row.original.netIncome != null ? formatMoney(row.original.netIncome, row.original.currency) : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'ebitda',
      header: 'EBITDA',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-right block">
          {row.original.ebitda != null ? formatMoney(row.original.ebitda, row.original.currency) : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'auditorName',
      header: 'Auditor',
      cell: ({ getValue }) => <span className="truncate max-w-[120px] block">{getValue<string>() || '--'}</span>,
    },
    {
      accessorKey: 'auditOpinion',
      header: 'Opinion',
      cell: ({ getValue }) => {
        const o = getValue<string>();
        return o ? (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', opinionColor(o))}>{o}</span>
        ) : <span className="text-muted-foreground">--</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
  ], []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Financial Statements"
        subtitle="Customer financial statement analysis and ratio computation"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Record Statement
          </button>
        }
      />

      {/* Customer Lookup */}
      <div className="px-6">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
            <input
              type="number"
              className="mt-1 block w-52 rounded-md border px-3 py-2 text-sm"
              placeholder="Enter customer ID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            />
          </div>
          <button
            onClick={handleLoad}
            disabled={statementsQuery.isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {statementsQuery.isFetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Load Statements
          </button>
        </div>
      </div>

      {/* Statements Table */}
      <div className="px-6">
        {loadedCustomerId == null ? (
          <EmptyState
            icon={FileBarChart2}
            title="No customer selected"
            description="Enter a Customer ID above to view their financial statements."
          />
        ) : statementsQuery.isError ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load statements. Please try again.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={statementsQuery.data ?? []}
            isLoading={statementsQuery.isLoading}
            onRowClick={setSelected}
            emptyMessage="No financial statements found for this customer."
            enableGlobalFilter
            exportFilename={`financial-statements-${loadedCustomerId}`}
          />
        )}
      </div>

      {/* Detail Slide-Over */}
      {selected && (
        <StatementDetailSlideOver
          statement={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Create Dialog */}
      <RecordStatementDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        defaultCustomerId={loadedCustomerId ?? undefined}
      />
    </div>
  );
}

export default FinancialStatementsPage;
