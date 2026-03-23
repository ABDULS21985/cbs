import { useEffect, useState, type ElementType, type ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  Landmark,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { escrowApi } from '../../api/escrowApi';
import type { CreateEscrowRequest, EscrowType } from '../../types/escrow';

const ESCROW_TYPES: Array<{
  value: EscrowType;
  label: string;
  description: string;
  helper: string;
  icon: ElementType;
}> = [
  {
    value: 'ESCROW',
    label: 'Escrow',
    description: 'Standard ring-fenced mandate for conditional disbursement.',
    helper: 'Best for milestone-based or third-party release control.',
    icon: ShieldCheck,
  },
  {
    value: 'TRUST',
    label: 'Trust',
    description: 'Fiduciary custody structure for managed obligations.',
    helper: 'Suitable when the bank is administering assets on behalf of parties.',
    icon: Landmark,
  },
  {
    value: 'RETENTION',
    label: 'Retention',
    description: 'Contract retention balance held until obligations are completed.',
    helper: 'Useful for project delivery holdbacks and performance retention.',
    icon: FileCheck2,
  },
  {
    value: 'COLLATERAL_CASH',
    label: 'Collateral Cash',
    description: 'Cash-backed security position for lending or trading lines.',
    helper: 'Use when funds are held as collateral against an approved facility.',
    icon: ShieldAlert,
  },
];

const OPTIONAL_NUMBER_FIELDS = new Set(['depositorCustomerId', 'beneficiaryCustomerId', 'requiredSignatories']);

function SummaryMetric({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactElement;
}) {
  return (
    <div className="escrow-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="escrow-mini-icon">{icon}</div>
      </div>
    </div>
  );
}

export function NewEscrowPage() {
  useEffect(() => {
    document.title = 'New Escrow Mandate | CBS';
  }, []);

  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateEscrowRequest>({
    accountId: 0,
    escrowType: 'ESCROW',
    purpose: '',
    mandatedAmount: 0,
    currencyCode: 'NGN',
  });
  const [conditions, setConditions] = useState<string[]>(['']);

  const createMutation = useMutation({
    mutationFn: (data: CreateEscrowRequest) => escrowApi.create(data),
    onSuccess: (result) => {
      toast.success('Escrow mandate created');
      setCreatedId(result.id);
      setSuccess(true);
    },
    onError: () => {
      toast.error('Failed to create escrow mandate');
    },
  });

  function updateField<K extends keyof CreateEscrowRequest>(name: K, value: CreateEscrowRequest[K]) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;

    if (type === 'number') {
      if (value === '') {
        if (OPTIONAL_NUMBER_FIELDS.has(name)) {
          setForm((prev) => ({ ...prev, [name]: undefined }));
          return;
        }

        setForm((prev) => ({ ...prev, [name]: 0 }));
        return;
      }

      setForm((prev) => ({ ...prev, [name]: Number(value) }));
      return;
    }

    if (name === 'currencyCode') {
      setForm((prev) => ({ ...prev, currencyCode: value.toUpperCase().slice(0, 3) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const releaseConditions = conditions
      .map((condition) => condition.trim())
      .filter(Boolean);

    const payload: CreateEscrowRequest = {
      accountId: form.accountId,
      escrowType: form.escrowType,
      purpose: form.purpose.trim(),
      mandatedAmount: form.mandatedAmount,
      currencyCode: form.currencyCode?.trim().toUpperCase() || 'NGN',
      ...(form.depositorCustomerId ? { depositorCustomerId: form.depositorCustomerId } : {}),
      ...(form.beneficiaryCustomerId ? { beneficiaryCustomerId: form.beneficiaryCustomerId } : {}),
      ...(releaseConditions.length > 0 ? { releaseConditions } : {}),
      ...(form.expiryDate ? { expiryDate: form.expiryDate } : {}),
      ...(form.requiresMultiSign ? { requiresMultiSign: true } : {}),
      ...(form.requiresMultiSign && form.requiredSignatories ? { requiredSignatories: form.requiredSignatories } : {}),
    };

    createMutation.mutate(payload);
  }

  function updateCondition(index: number, value: string) {
    setConditions((prev) => prev.map((condition, currentIndex) => (currentIndex === index ? value : condition)));
  }

  function removeCondition(index: number) {
    setConditions((prev) => (prev.length === 1 ? [''] : prev.filter((_, currentIndex) => currentIndex !== index)));
  }

  const selectedType = ESCROW_TYPES.find((option) => option.value === form.escrowType) ?? ESCROW_TYPES[0];
  const trimmedConditions = conditions.map((condition) => condition.trim()).filter(Boolean);
  const completionCount = [
    form.accountId > 0,
    form.mandatedAmount > 0,
    form.purpose.trim().length > 0,
    trimmedConditions.length > 0,
  ].filter(Boolean).length;
  const progressPercent = Math.round((completionCount / 4) * 100);
  const formattedMandateAmount = formatMoney(form.mandatedAmount || 0, form.currencyCode || 'NGN');
  const controlLabel = form.requiresMultiSign
    ? `${form.requiredSignatories ?? 2} signatories required`
    : 'Single release approval path';

  if (success) {
    return (
      <div className="page-container space-y-6">
        <section className="escrow-success-shell">
          <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.1fr)_320px] xl:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="escrow-hero-chip">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Mandate created
                </div>
                <div className="escrow-hero-chip">
                  {selectedType.label} structure
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Escrow mandate submitted</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  The mandate has been created successfully and is ready for downstream review, funding, and conditional release processing.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label="Mandated Amount"
                  value={formattedMandateAmount}
                  helper="Captured on the new mandate"
                  icon={<Wallet className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Release Controls"
                  value={form.requiresMultiSign ? 'Multi-sign' : 'Standard'}
                  helper={controlLabel}
                  icon={<BadgeCheck className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Conditions"
                  value={String(trimmedConditions.length)}
                  helper="Release conditions stored with the request"
                  icon={<CircleDashed className="h-5 w-5" />}
                />
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="escrow-side-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Mandate Snapshot</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="escrow-side-row">
                    <span className="text-muted-foreground">Funding account</span>
                    <span className="font-semibold">{form.accountId}</span>
                  </div>
                  <div className="escrow-side-row">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-semibold">{selectedType.label}</span>
                  </div>
                  <div className="escrow-side-row">
                    <span className="text-muted-foreground">Expiry</span>
                    <span className="font-semibold">{form.expiryDate || 'Open-ended'}</span>
                  </div>
                </div>
              </div>

              <div className="escrow-side-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Next Actions</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Open the mandate to manage releases, approvals, and any linked operational follow-up.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/accounts/escrow/${createdId}`)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View Mandate
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/accounts/escrow')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70"
                  >
                    Back to List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <section className="escrow-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate('/accounts/escrow')} className="escrow-hero-chip" aria-label="Back to escrow mandates">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="escrow-hero-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Escrow origination
              </div>
              <div className="escrow-hero-chip">
                {selectedType.label} workflow
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Create Escrow Mandate</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Capture the funding account, lock the commercial purpose, define release conditions, and submit a mandate that operations can manage end to end.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label="Funding Account"
                value={form.accountId > 0 ? String(form.accountId) : 'Pending'}
                helper="Source ledger for the escrow hold"
                icon={<Wallet className="h-5 w-5" />}
              />
              <SummaryMetric
                label="Mandated Amount"
                value={formattedMandateAmount}
                helper="Live preview of the instructed balance"
                icon={<Landmark className="h-5 w-5" />}
              />
              <SummaryMetric
                label="Control Pattern"
                value={form.requiresMultiSign ? 'Multi-sign' : 'Standard'}
                helper={controlLabel}
                icon={<Users className="h-5 w-5" />}
              />
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="escrow-side-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Setup Readiness</p>
              <div className="mt-4 space-y-3">
                <div
                  className="opening-progress-track"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${progressPercent}% complete`}
                >
                  <div className="opening-progress-fill transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Form completion</span>
                  <span className="font-semibold">{progressPercent}%</span>
                </div>
                <div className="escrow-side-row">
                  <span className="text-muted-foreground">Conditions</span>
                  <span className="font-semibold">{trimmedConditions.length}</span>
                </div>
                <div className="escrow-side-row">
                  <span className="text-muted-foreground">Control mode</span>
                  <span className="font-semibold">{form.requiresMultiSign ? 'Dual control' : 'Standard'}</span>
                </div>
              </div>
            </div>

            <div className="escrow-side-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Operating Notes</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="escrow-note-row">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span>Release conditions are stored exactly as entered after trimming blank rows.</span>
                </div>
                <div className="escrow-note-row">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Optional party identifiers are omitted from the request when left blank.</span>
                </div>
                <div className="escrow-note-row">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  <span>Mandates can be reviewed and actioned from the escrow register after creation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="escrow-workspace-shell">
          <div className="escrow-banner">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Mandate Builder</p>
                <h2 className="mt-2 text-xl font-semibold">{selectedType.label} mandate details</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedType.helper}</p>
              </div>
              <div className="escrow-hero-chip">
                <selectedType.icon className="h-3.5 w-3.5 text-primary" />
                {selectedType.description}
              </div>
            </div>
          </div>

          <div className="escrow-content-shell space-y-6">
            <section className="escrow-section-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">1. Structure</p>
                <h3 className="mt-2 text-lg font-semibold">Choose mandate type</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the legal or operational structure that best matches the release arrangement.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {ESCROW_TYPES.map((option) => {
                  const Icon = option.icon;
                  const isActive = form.escrowType === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => updateField('escrowType', option.value)}
                      className={cn('escrow-type-card', isActive && 'escrow-type-card-active')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 text-left">
                          <div className="flex items-center gap-2">
                            <div className="escrow-mini-icon h-10 w-10 rounded-xl">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <p className="text-base font-semibold">{option.label}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                          <p className="text-xs text-muted-foreground">{option.helper}</p>
                        </div>
                        {isActive ? <BadgeCheck className="h-5 w-5 text-primary" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="escrow-section-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">2. Funding & Purpose</p>
                <h3 className="mt-2 text-lg font-semibold">Set the core mandate instructions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These values drive how the mandate is recorded, monitored, and reported.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="accountId" className="text-sm font-medium">Funding Account ID</label>
                  <input
                    id="accountId"
                    name="accountId"
                    type="number"
                    min={1}
                    required
                    value={form.accountId || ''}
                    onChange={handleChange}
                    className="escrow-field-input"
                    placeholder="Enter source account ID"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="currencyCode" className="text-sm font-medium">Currency Code</label>
                  <input
                    id="currencyCode"
                    name="currencyCode"
                    required
                    maxLength={3}
                    value={form.currencyCode || ''}
                    onChange={handleChange}
                    className="escrow-field-input"
                    placeholder="NGN"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-2">
                  <label htmlFor="purpose" className="text-sm font-medium">Mandate Purpose</label>
                  <textarea
                    id="purpose"
                    name="purpose"
                    required
                    maxLength={500}
                    value={form.purpose}
                    onChange={handleChange}
                    className="escrow-field-input min-h-[124px] resize-none"
                    placeholder="Describe the commercial purpose and release expectations for this mandate"
                  />
                </div>
                <div className="escrow-note-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Amount Preview</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{formattedMandateAmount}</p>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p>The instructed amount is stored as the mandate ceiling until releases are processed.</p>
                    <div className="escrow-side-row">
                      <span>Escrow type</span>
                      <span className="font-semibold text-foreground">{selectedType.label}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="mandatedAmount" className="text-sm font-medium">Mandated Amount</label>
                <input
                  id="mandatedAmount"
                  name="mandatedAmount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={form.mandatedAmount || ''}
                  onChange={handleChange}
                  className="escrow-field-input"
                  placeholder="0.00"
                />
              </div>
            </section>

            <section className="escrow-section-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">3. Parties & Controls</p>
                <h3 className="mt-2 text-lg font-semibold">Capture parties and approval requirements</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add optional participant IDs and decide whether the mandate needs multi-sign approval.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="depositorCustomerId" className="text-sm font-medium">Depositor Customer ID</label>
                  <input
                    id="depositorCustomerId"
                    name="depositorCustomerId"
                    type="number"
                    value={form.depositorCustomerId || ''}
                    onChange={handleChange}
                    className="escrow-field-input"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="beneficiaryCustomerId" className="text-sm font-medium">Beneficiary Customer ID</label>
                  <input
                    id="beneficiaryCustomerId"
                    name="beneficiaryCustomerId"
                    type="number"
                    value={form.beneficiaryCustomerId || ''}
                    onChange={handleChange}
                    className="escrow-field-input"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-2">
                  <label htmlFor="expiryDate" className="text-sm font-medium">Expiry Date</label>
                  <input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    value={form.expiryDate || ''}
                    onChange={handleChange}
                    className="escrow-field-input"
                  />
                </div>
                <div className="escrow-note-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Expiry Handling</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Leave blank if the mandate should remain open until formally released or cancelled.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/60 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name="requiresMultiSign"
                    checked={form.requiresMultiSign || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        requiresMultiSign: isChecked,
                        requiredSignatories: isChecked ? prev.requiredSignatories : undefined,
                      }));
                    }}
                    className="mt-1 rounded border-border"
                  />
                  <div>
                    <p className="text-sm font-semibold">Enable multi-sign release approval</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Turn this on when release requests must be approved by more than one signatory.
                    </p>
                  </div>
                </label>

                {form.requiresMultiSign ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <label htmlFor="requiredSignatories" className="text-sm font-medium">Required Signatories</label>
                      <input
                        id="requiredSignatories"
                        name="requiredSignatories"
                        type="number"
                        min={2}
                        required
                        value={form.requiredSignatories || ''}
                        onChange={handleChange}
                        className="escrow-field-input"
                        placeholder="2"
                      />
                    </div>
                    <div className="escrow-note-card escrow-note-card-warning">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Control Note</p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Approval routing will expect the configured number of signatories before a release can move forward.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="escrow-section-card space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">4. Release Conditions</p>
                <h3 className="mt-2 text-lg font-semibold">Define release triggers</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the operational or documentary checks that should govern subsequent releases.
                </p>
              </div>

              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div key={`${index}-${condition}`} className="escrow-condition-row">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <input
                      value={condition}
                      onChange={(e) => updateCondition(index, e.target.value)}
                      className="escrow-field-input flex-1"
                      placeholder={`Release condition ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/70"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setConditions((prev) => [...prev, ''])}
                  className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <CircleDashed className="h-4 w-4" /> Add Condition
                </button>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-2">
              <p className="text-sm text-muted-foreground">
                The form submits directly to the live escrow mandate create endpoint.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/accounts/escrow')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Create Mandate
                </button>
              </div>
            </div>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6 self-start">
          <div className="escrow-sidebar-shell">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Live Summary</p>
            <div className="mt-4 space-y-3">
              <div className="escrow-side-row">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold">{selectedType.label}</span>
              </div>
              <div className="escrow-side-row">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formattedMandateAmount}</span>
              </div>
              <div className="escrow-side-row">
                <span className="text-muted-foreground">Expiry</span>
                <span className="font-semibold">{form.expiryDate || 'Open-ended'}</span>
              </div>
              <div className="escrow-side-row">
                <span className="text-muted-foreground">Conditions</span>
                <span className="font-semibold">{trimmedConditions.length}</span>
              </div>
            </div>
          </div>

          <div className="escrow-sidebar-shell">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Before You Submit</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="escrow-note-row">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Confirm the source account and amount are final.</span>
              </div>
              <div className="escrow-note-row">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Capture only customer IDs that are known and valid.</span>
              </div>
              <div className="escrow-note-row">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Enable multi-sign only when release governance requires it.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
