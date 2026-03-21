import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ShieldCheck, AlertCircle, Clock, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useHasRole } from '@/hooks/usePermission';
import { formatDate, formatMoney } from '@/lib/formatters';
import {
  useExpiredProfiles,
  useAllProfiles,
  useAllChecks,
  useCreateSuitabilityProfile,
  usePerformSuitabilityCheck,
  useAcknowledgeDisclosure,
  useOverrideCheck,
} from '../hooks/useAdvisory';
import type {
  SuitabilityProfile,
  SuitabilityCheck,
  SuitabilityResult,
  RiskTolerance,
  InvestmentObjective,
  InvestmentHorizon,
  InvestmentExperience,
  CheckType,
  InstrumentRiskRating,
  CreateSuitabilityProfilePayload,
  PerformSuitabilityCheckPayload,
} from '../api/advisoryApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_TOLERANCES: { value: RiskTolerance; label: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservative' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
  { value: 'VERY_AGGRESSIVE', label: 'Very Aggressive' },
];

const INVESTMENT_OBJECTIVES: { value: InvestmentObjective; label: string }[] = [
  { value: 'CAPITAL_PRESERVATION', label: 'Capital Preservation' },
  { value: 'INCOME', label: 'Income' },
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'GROWTH', label: 'Growth' },
  { value: 'AGGRESSIVE_GROWTH', label: 'Aggressive Growth' },
  { value: 'SPECULATION', label: 'Speculation' },
];

const INVESTMENT_HORIZONS: { value: InvestmentHorizon; label: string }[] = [
  { value: 'SHORT_TERM', label: 'Short Term' },
  { value: 'MEDIUM_TERM', label: 'Medium Term' },
  { value: 'LONG_TERM', label: 'Long Term' },
  { value: 'VERY_LONG_TERM', label: 'Very Long Term' },
];

const EXPERIENCE_LEVELS: { value: InvestmentExperience; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'LIMITED', label: 'Limited' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'EXTENSIVE', label: 'Extensive' },
  { value: 'PROFESSIONAL', label: 'Professional' },
];

const CHECK_TYPES: { value: CheckType; label: string }[] = [
  { value: 'PRE_TRADE', label: 'Pre-Trade' },
  { value: 'PERIODIC_REVIEW', label: 'Periodic Review' },
  { value: 'PRODUCT_CHANGE', label: 'Product Change' },
  { value: 'PORTFOLIO_REBALANCE', label: 'Portfolio Rebalance' },
  { value: 'ADVISORY', label: 'Advisory' },
];

const INSTRUMENT_RISK_RATINGS: { value: InstrumentRiskRating; label: string }[] = [
  { value: 'LOW_RISK', label: 'Low Risk' },
  { value: 'MEDIUM_RISK', label: 'Medium Risk' },
  { value: 'HIGH_RISK', label: 'High Risk' },
  { value: 'VERY_HIGH_RISK', label: 'Very High Risk' },
  { value: 'SPECULATIVE', label: 'Speculative' },
];

const REGULATORY_BASES = ['MIFID_II', 'SEC_REGULATION', 'CBN_GUIDELINE', 'INTERNAL_POLICY'];

// ─── Dialog helpers ──────────────────────────────────────────────────────────

function DialogBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-4">{children}</h2>;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Result colour helper ─────────────────────────────────────────────────────

function resultClass(result: string): string {
  if (result === 'SUITABLE') return 'text-green-700 bg-green-50 border-green-200';
  if (result === 'UNSUITABLE') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-amber-700 bg-amber-50 border-amber-200'; // SUITABLE_WITH_WARNING
}

function ResultChip({ result }: { result: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${resultClass(result)}`}>
      {result === 'SUITABLE_WITH_WARNING' ? 'WARNING' : result}
    </span>
  );
}

// ─── New Assessment Dialog ────────────────────────────────────────────────────

function NewAssessmentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSuitabilityProfile();
  const [form, setForm] = useState<Partial<CreateSuitabilityProfilePayload>>({
    derivativesApproved: false,
    leverageApproved: false,
  });

  const set = (k: keyof CreateSuitabilityProfilePayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.investmentObjective || !form.riskTolerance || !form.investmentHorizon) {
      toast.error('Fill in all required fields');
      return;
    }
    create.mutate(form as CreateSuitabilityProfilePayload, {
      onSuccess: (p) => {
        toast.success(`Profile ${p.profileCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create profile'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>New Suitability Assessment</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label="Customer ID *">
          <input required type="number" className={inputCls} value={form.customerId ?? ''} onChange={e => set('customerId', e.target.value ? Number(e.target.value) : undefined)} />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Investment Objective *">
            <select className={selectCls} value={form.investmentObjective || ''} onChange={e => set('investmentObjective', e.target.value as InvestmentObjective)}>
              <option value="">Select...</option>
              {INVESTMENT_OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Risk Tolerance *">
            <select className={selectCls} value={form.riskTolerance || ''} onChange={e => set('riskTolerance', e.target.value as RiskTolerance)}>
              <option value="">Select...</option>
              {RISK_TOLERANCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </FieldLabel>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Investment Horizon *">
            <select className={selectCls} value={form.investmentHorizon || ''} onChange={e => set('investmentHorizon', e.target.value as InvestmentHorizon)}>
              <option value="">Select...</option>
              {INVESTMENT_HORIZONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Investment Experience">
            <select className={selectCls} value={form.investmentExperience || ''} onChange={e => set('investmentExperience', e.target.value as InvestmentExperience)}>
              <option value="">Select...</option>
              {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </FieldLabel>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FieldLabel label="Annual Income">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.annualIncome ?? ''} onChange={e => set('annualIncome', e.target.value ? Number(e.target.value) : undefined)} />
          </FieldLabel>
          <FieldLabel label="Net Worth">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.netWorth ?? ''} onChange={e => set('netWorth', e.target.value ? Number(e.target.value) : undefined)} />
          </FieldLabel>
          <FieldLabel label="Liquid Net Worth">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.liquidNetWorth ?? ''} onChange={e => set('liquidNetWorth', e.target.value ? Number(e.target.value) : undefined)} />
          </FieldLabel>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Knowledge Score (0-100)">
            <input type="number" min="0" max="100" step="0.01" className={inputCls} value={form.knowledgeAssessmentScore ?? ''} onChange={e => set('knowledgeAssessmentScore', e.target.value ? Number(e.target.value) : undefined)} />
          </FieldLabel>
          <FieldLabel label="Max Single Inv. %">
            <input type="number" min="0" max="100" step="0.01" className={inputCls} value={form.maxSingleInvestmentPct ?? ''} onChange={e => set('maxSingleInvestmentPct', e.target.value ? Number(e.target.value) : undefined)} />
          </FieldLabel>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Next Review Date">
            <input type="date" className={inputCls} value={form.nextReviewDate || ''} onChange={e => set('nextReviewDate', e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Regulatory Basis">
            <select className={selectCls} value={form.regulatoryBasis || ''} onChange={e => set('regulatoryBasis', e.target.value)}>
              <option value="">Select...</option>
              {REGULATORY_BASES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </FieldLabel>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.derivativesApproved || false} onChange={e => set('derivativesApproved', e.target.checked)} />
            Derivatives Approved
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.leverageApproved || false} onChange={e => set('leverageApproved', e.target.checked)} />
            Leverage Approved
          </label>
        </div>
        <FieldLabel label="Assessed By">
          <input className={inputCls} value={form.assessedBy || ''} onChange={e => set('assessedBy', e.target.value)} placeholder="Officer name" />
        </FieldLabel>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Perform Check Dialog ───────────────────────────────────────────────────

function PerformCheckDialog({ onClose }: { onClose: () => void }) {
  const check = usePerformSuitabilityCheck();
  const [form, setForm] = useState<Partial<PerformSuitabilityCheckPayload>>({});
  const [result, setResult] = useState<SuitabilityCheck | null>(null);

  const set = (k: keyof PerformSuitabilityCheckPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.profileId || !form.checkType || !form.instrumentType) {
      toast.error('Fill in all required fields');
      return;
    }
    check.mutate(form as PerformSuitabilityCheckPayload, {
      onSuccess: (data) => setResult(data),
      onError: () => toast.error('Failed to perform check'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>Perform Suitability Check</DialogTitle>

      {result ? (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 border ${resultClass(result.overallResult)}`}>
            <p className="text-sm font-semibold">Result: {result.overallResult}</p>
            <p className="text-xs mt-1">Check Ref: {result.checkRef}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 rounded border ${result.riskToleranceMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Risk Tolerance: {result.riskToleranceMatch ? 'Pass' : 'Fail'}
            </div>
            <div className={`p-2 rounded border ${result.experienceMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Experience: {result.experienceMatch ? 'Pass' : 'Fail'}
            </div>
            <div className={`p-2 rounded border ${result.concentrationCheck ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Concentration: {result.concentrationCheck ? 'Pass' : 'Fail'}
            </div>
            <div className={`p-2 rounded border ${result.liquidityCheck ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Liquidity: {result.liquidityCheck ? 'Pass' : 'Fail'}
            </div>
            <div className={`p-2 rounded border ${result.knowledgeCheck ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Knowledge: {result.knowledgeCheck ? 'Pass' : 'Fail'}
            </div>
            <div className={`p-2 rounded border ${result.leverageCheck ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              Leverage: {result.leverageCheck ? 'Pass' : 'Fail'}
            </div>
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldLabel label="Profile ID *">
            <input required type="number" className={inputCls} value={form.profileId ?? ''} onChange={e => set('profileId', e.target.value ? Number(e.target.value) : undefined)} placeholder="Client risk profile ID" />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Check Type *">
              <select className={selectCls} value={form.checkType || ''} onChange={e => set('checkType', e.target.value as CheckType)}>
                <option value="">Select...</option>
                {CHECK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Instrument Risk Rating">
              <select className={selectCls} value={form.instrumentRiskRating || ''} onChange={e => set('instrumentRiskRating', e.target.value as InstrumentRiskRating)}>
                <option value="">Select...</option>
                {INSTRUMENT_RISK_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FieldLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Instrument Type *">
              <input required className={inputCls} value={form.instrumentType || ''} onChange={e => set('instrumentType', e.target.value)} placeholder="e.g. EQUITY, BOND" />
            </FieldLabel>
            <FieldLabel label="Instrument Code">
              <input className={inputCls} value={form.instrumentCode || ''} onChange={e => set('instrumentCode', e.target.value)} placeholder="e.g. AAPL" />
            </FieldLabel>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FieldLabel label="Proposed Amount">
              <input type="number" min="0" step="0.01" className={inputCls} value={form.proposedAmount ?? ''} onChange={e => set('proposedAmount', e.target.value ? Number(e.target.value) : undefined)} />
            </FieldLabel>
            <FieldLabel label="% of Portfolio">
              <input type="number" min="0" max="100" step="0.01" className={inputCls} value={form.proposedPctOfPortfolio ?? ''} onChange={e => set('proposedPctOfPortfolio', e.target.value ? Number(e.target.value) : undefined)} />
            </FieldLabel>
            <FieldLabel label="% of Net Worth">
              <input type="number" min="0" max="100" step="0.01" className={inputCls} value={form.proposedPctOfNetWorth ?? ''} onChange={e => set('proposedPctOfNetWorth', e.target.value ? Number(e.target.value) : undefined)} />
            </FieldLabel>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={check.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {check.isPending ? 'Checking...' : 'Run Check'}
            </button>
          </div>
        </form>
      )}
    </DialogBackdrop>
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
        <div key={p.profileCode} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Customer #{p.customerId}</p>
            <p className="text-xs text-muted-foreground">
              Risk: {p.riskTolerance} · Horizon: {p.investmentHorizon} · Objective: {p.investmentObjective}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
            {p.nextReviewDate && <p>Review: {formatDate(p.nextReviewDate)}</p>}
            <p>Profile: {formatDate(p.profileDate)}</p>
          </div>
          <StatusBadge status={p.status} dot />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Check Row Actions ────────────────────────────────────────────────────────

function CheckActions({ check }: { check: SuitabilityCheck }) {
  const override = useOverrideCheck();
  const acknowledge = useAcknowledgeDisclosure();
  const isAdmin = useHasRole('CBS_ADMIN');
  const [showOverride, setShowOverride] = useState(false);
  const [justification, setJustification] = useState('');
  const [approver, setApprover] = useState('');

  const canOverride = isAdmin && !check.overrideApplied && check.overallResult !== 'SUITABLE';
  const canAcknowledge = !check.clientAcknowledged;

  function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!justification || !approver) { toast.error('Fill in all fields'); return; }
    override.mutate({ ref: check.checkRef, justification, approver }, {
      onSuccess: () => { toast.success('Override applied'); setShowOverride(false); },
      onError: () => toast.error('Failed to apply override'),
    });
  }

  function handleAcknowledge() {
    acknowledge.mutate(check.checkRef, {
      onSuccess: () => toast.success('Disclosure acknowledged'),
      onError: () => toast.error('Failed to acknowledge'),
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {canAcknowledge && (
          <button
            onClick={handleAcknowledge}
            disabled={acknowledge.isPending}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
            title="Acknowledge disclosure"
          >
            <CheckCircle2 className="w-3 h-3" />
          </button>
        )}
        {canOverride && (
          <button
            onClick={() => setShowOverride(true)}
            className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            title="Override check result"
          >
            <ShieldAlert className="w-3 h-3" />
          </button>
        )}
      </div>

      {showOverride && (
        <DialogBackdrop>
          <DialogTitle>Override Suitability Check — {check.checkRef}</DialogTitle>
          <p className="text-xs text-muted-foreground mb-4">
            Current result: <strong>{check.overallResult}</strong>. Overriding will change to SUITABLE_WITH_WARNING.
          </p>
          <form onSubmit={handleOverride} className="space-y-4">
            <FieldLabel label="Justification *">
              <textarea className={`${inputCls} resize-none`} rows={3} value={justification} onChange={e => setJustification(e.target.value)} required placeholder="e.g. Client insists, senior approval obtained" />
            </FieldLabel>
            <FieldLabel label="Approver *">
              <input className={inputCls} value={approver} onChange={e => setApprover(e.target.value)} required placeholder="ADMIN-001" />
            </FieldLabel>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowOverride(false)} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
              <button type="submit" disabled={override.isPending} className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
                {override.isPending ? 'Applying...' : 'Apply Override'}
              </button>
            </div>
          </form>
        </DialogBackdrop>
      )}
    </>
  );
}

export function SuitabilityPage() {
  const [showAssessment, setShowAssessment] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const { data: expiredProfiles = [], isLoading: expiredLoading } = useExpiredProfiles();
  const { data: allProfiles = [], isLoading: profilesLoading } = useAllProfiles();
  const { data: allChecks = [], isLoading: checksLoading } = useAllChecks();

  const checksToday = allChecks.filter(
    c => c.checkedAt?.startsWith(new Date().toISOString().slice(0, 10)),
  ).length;

  const checkCols: ColumnDef<SuitabilityCheck, unknown>[] = [
    {
      accessorKey: 'checkRef',
      header: 'Ref',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.checkRef}</span>,
    },
    {
      accessorKey: 'customerId',
      header: 'Customer',
      cell: ({ row }) => <span className="text-sm">#{row.original.customerId}</span>,
    },
    { accessorKey: 'instrumentType', header: 'Instrument' },
    { accessorKey: 'checkType', header: 'Check Type' },
    {
      accessorKey: 'proposedAmount',
      header: 'Amount',
      cell: ({ row }) => row.original.proposedAmount ? formatMoney(row.original.proposedAmount) : '-',
    },
    {
      accessorKey: 'overallResult',
      header: 'Result',
      cell: ({ row }) => <ResultChip result={row.original.overallResult} />,
    },
    {
      accessorKey: 'overrideApplied',
      header: 'Override',
      cell: ({ row }) => row.original.overrideApplied ? <StatusBadge status="OVERRIDDEN" /> : '-',
    },
    {
      accessorKey: 'clientAcknowledged',
      header: 'Acknowledged',
      cell: ({ row }) => row.original.clientAcknowledged
        ? <span className="text-xs text-green-600">Yes</span>
        : <span className="text-xs text-muted-foreground">No</span>,
    },
    {
      accessorKey: 'checkedAt',
      header: 'Date',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.checkedAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <CheckActions check={row.original} />,
    },
  ];

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
            label="Total Profiles"
            value={allProfiles.length}
            format="number"
            icon={Users}
            loading={profilesLoading}
          />
          <StatCard
            label="Expired Profiles"
            value={expiredProfiles.length}
            format="number"
            icon={AlertCircle}
            loading={expiredLoading}
          />
          <StatCard
            label="Checks Today"
            value={checksToday}
            format="number"
            icon={ShieldCheck}
            loading={checksLoading}
          />
          <StatCard
            label="Total Checks"
            value={allChecks.length}
            format="number"
            icon={Clock}
            loading={checksLoading}
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
              data={allChecks}
              isLoading={checksLoading}
              enableGlobalFilter
              enableExport
              exportFilename="suitability-checks"
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
      {showCheck && <PerformCheckDialog onClose={() => setShowCheck(false)} />}
    </>
  );
}
