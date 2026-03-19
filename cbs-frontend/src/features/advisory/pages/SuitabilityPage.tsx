import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ShieldCheck, AlertCircle, Clock, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import {
  useExpiredProfiles,
  useCreateSuitabilityProfile,
  usePerformSuitabilityCheck,
} from '../hooks/useAdvisory';
import type {
  SuitabilityProfile,
  SuitabilityCheck,
  SuitabilityResult,
  RiskTolerance,
} from '../api/advisoryApi';

const RISK_TOLERANCES: RiskTolerance[] = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];

// ─── Result colour helper ─────────────────────────────────────────────────────

function resultClass(result: SuitabilityResult): string {
  if (result === 'SUITABLE') return 'text-green-700 bg-green-50 border-green-200';
  if (result === 'UNSUITABLE') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-amber-700 bg-amber-50 border-amber-200'; // OVERRIDE
}

function ResultChip({ result }: { result: SuitabilityResult }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${resultClass(result)}`}>
      {result}
    </span>
  );
}

// ─── New Assessment Dialog ────────────────────────────────────────────────────

function NewAssessmentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSuitabilityProfile();
  const [form, setForm] = useState({
    customerId: '',
    riskTolerance: 'MODERATE' as RiskTolerance,
    investmentHorizon: '',
    liquidityNeeds: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        customerId: Number(form.customerId),
        riskTolerance: form.riskTolerance,
        investmentHorizon: form.investmentHorizon,
        liquidityNeeds: form.liquidityNeeds,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="font-semibold">New Suitability Assessment</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium">
            Customer ID
            <input
              required
              type="number"
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium">
            Risk Tolerance
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.riskTolerance}
              onChange={(e) => setForm((f) => ({ ...f, riskTolerance: e.target.value as RiskTolerance }))}
            >
              {RISK_TOLERANCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Investment Horizon
            <input
              required
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              placeholder="e.g. 5 YEARS"
              value={form.investmentHorizon}
              onChange={(e) => setForm((f) => ({ ...f, investmentHorizon: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium">
            Liquidity Needs
            <input
              required
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              placeholder="e.g. LOW / MEDIUM / HIGH"
              value={form.liquidityNeeds}
              onChange={(e) => setForm((f) => ({ ...f, liquidityNeeds: e.target.value }))}
            />
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Quick Check Dialog ───────────────────────────────────────────────────────

function QuickCheckDialog({ onClose }: { onClose: () => void }) {
  const check = usePerformSuitabilityCheck();
  const [form, setForm] = useState({ customerId: '', productCode: '', recommendedAmount: '' });
  const [result, setResult] = useState<SuitabilityCheck | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    check.mutate(
      {
        customerId: Number(form.customerId),
        productCode: form.productCode,
        recommendedAmount: Number(form.recommendedAmount),
      },
      { onSuccess: (data) => setResult(data) },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="font-semibold">Perform Suitability Check</h2>

        {result ? (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border ${resultClass(result.result)}`}>
              <p className="text-sm font-semibold">Result: {result.result}</p>
              <p className="text-xs mt-1">{result.notes}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-medium">
              Customer ID
              <input
                required
                type="number"
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Product Code
              <input
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.productCode}
                onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Recommended Amount
              <input
                required
                type="number"
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.recommendedAmount}
                onChange={(e) => setForm((f) => ({ ...f, recommendedAmount: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={check.isPending}
                className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {check.isPending ? 'Checking…' : 'Run Check'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Expired profiles list ────────────────────────────────────────────────────

function ExpiredProfilesList({ profiles }: { profiles: SuitabilityProfile[] }) {
  if (profiles.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No expired profiles.</p>;
  }
  return (
    <div className="space-y-2">
      {profiles.map((p) => (
        <div key={p.code} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.customerName}</p>
            <p className="text-xs text-muted-foreground">Risk: {p.riskTolerance} · Horizon: {p.investmentHorizon}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
            <p>Expired: {formatDate(p.expiryDate)}</p>
            <p>Last review: {formatDate(p.lastReviewDate)}</p>
          </div>
          <StatusBadge status={p.status} dot />
        </div>
      ))}
    </div>
  );
}

// ─── Stub checks data (checks come from suitability check mutations; no list endpoint provided) ─

const STUB_CHECKS: SuitabilityCheck[] = [];

const checkCols: ColumnDef<SuitabilityCheck, any>[] = [
  {
    accessorKey: 'ref',
    header: 'Ref',
    cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.ref}</span>,
  },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  {
    accessorKey: 'riskTolerance',
    header: 'Risk Tolerance',
    cell: ({ row }) => <StatusBadge status={row.original.riskTolerance} />,
  },
  {
    accessorKey: 'result',
    header: 'Result',
    cell: ({ row }) => <ResultChip result={row.original.result} />,
  },
  {
    accessorKey: 'checkedAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.checkedAt),
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuitabilityPage() {
  const [showAssessment, setShowAssessment] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const { data: expiredProfiles = [], isLoading: expiredLoading } = useExpiredProfiles();

  const checksToday = STUB_CHECKS.filter(
    (c) => c.checkedAt?.startsWith(new Date().toISOString().slice(0, 10)),
  ).length;

  return (
    <>
      <PageHeader
        title="Suitability Assessment"
        subtitle="Client risk profiling, product suitability checks and disclosure management"
      />
      <div className="page-container space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Expired Profiles"
            value={expiredProfiles.length}
            format="number"
            icon={AlertCircle}
            loading={expiredLoading}
          />
          <StatCard
            label="Profiles Due for Review"
            value={expiredProfiles.filter((p) => p.status === 'ACTIVE').length}
            format="number"
            icon={Clock}
            loading={expiredLoading}
          />
          <StatCard
            label="Checks Today"
            value={checksToday}
            format="number"
            icon={ShieldCheck}
          />
          <StatCard
            label="Total Profiles Monitored"
            value={expiredProfiles.length}
            format="number"
            icon={Users}
            loading={expiredLoading}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAssessment(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Assessment
          </button>
          <button
            onClick={() => setShowCheck(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted"
          >
            <ShieldCheck className="w-4 h-4" /> Perform Check
          </button>
        </div>

        {/* Recent checks table */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Recent Suitability Checks</h3>
          </div>
          <div className="p-4">
            <DataTable
              columns={checkCols}
              data={STUB_CHECKS}
              enableGlobalFilter
              emptyMessage="No suitability checks recorded yet"
            />
          </div>
        </div>

        {/* Expired profiles */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Expired / Overdue Profiles</h3>
            {expiredProfiles.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                {expiredProfiles.length} require renewal
              </span>
            )}
          </div>
          <div className="p-4">
            {expiredLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
              </div>
            ) : (
              <ExpiredProfilesList profiles={expiredProfiles} />
            )}
          </div>
        </div>
      </div>

      {showAssessment && <NewAssessmentDialog onClose={() => setShowAssessment(false)} />}
      {showCheck && <QuickCheckDialog onClose={() => setShowCheck(false)} />}
    </>
  );
}
