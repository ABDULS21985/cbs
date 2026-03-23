import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings2,
  History,
  Zap,
  Users,
  ArrowRight,
  ArrowLeft,
  Trash2,
  UserPlus,
  Building2,
  Check,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { PoolStructureTree } from '../components/cashpool/PoolStructureTree';
import { SweepHistoryTable } from '../components/cashpool/SweepHistoryTable';
import { SweepConfigForm } from '../components/cashpool/SweepConfigForm';
import { InterestBenefitCalculator } from '../components/cashpool/InterestBenefitCalculator';
import {
  getCashPools,
  getParticipants,
  getSweepHistory,
  createCashPool,
  triggerSweep,
  type CashPool,
  type CashPoolParticipant,
  type SweepTransaction,
} from '../api/cashPoolApi';
import {
  useSweepCashPool,
  useAddCashPoolParticipant,
  useUpdateCashPoolParticipant,
  useRemoveCashPoolParticipant,
} from '../hooks/useAccountsExt';
import type { ColumnDef } from '@tanstack/react-table';

// ── Wizard schemas ──────────────────────────────────────────────────────────

const wizardStep1Schema = z.object({
  poolName: z.string().min(3, 'Pool name is required'),
  poolType: z.enum(['ZERO_BALANCE', 'TARGET_BALANCE', 'THRESHOLD']),
  headerAccountId: z.number({ required_error: 'Header account ID is required' }).positive(),
  customerId: z.number({ required_error: 'Customer ID is required' }).positive(),
  currency: z.string().min(3).max(3).default('NGN'),
});

const wizardParticipantSchema = z.object({
  accountId: z.number({ required_error: 'Account ID is required' }).positive(),
  participantName: z.string().min(2, 'Participant name is required'),
  sweepDirection: z.enum(['INWARD', 'OUTWARD', 'BIDIRECTIONAL']),
  targetBalance: z.number().nonnegative().default(0),
  priority: z.number().int().min(1).max(999).default(100),
});

type WizardStep1Data = z.infer<typeof wizardStep1Schema>;
type WizardParticipantData = z.infer<typeof wizardParticipantSchema>;

const wizardSweepRulesSchema = z.object({
  sweepFrequency: z.enum(['REAL_TIME', 'EOD', 'DAILY', 'WEEKLY']),
  sweepTime: z.string().optional(),
  minSweepAmount: z.number().nonnegative().default(0),
  targetBalance: z.number().nonnegative().optional(),
  thresholdAmount: z.number().positive().optional(),
});

type WizardSweepRulesData = z.infer<typeof wizardSweepRulesSchema>;

// ── Create Pool Wizard ──────────────────────────────────────────────────────

interface CreatePoolWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePoolWizard({ onClose, onSuccess }: CreatePoolWizardProps) {
  const [step, setStep] = useState(1);
  const [poolData, setPoolData] = useState<WizardStep1Data | null>(null);
  const [participants, setParticipants] = useState<WizardParticipantData[]>([]);
  const [sweepRules, setSweepRules] = useState<WizardSweepRulesData | null>(null);

  const createMutation = useMutation({
    mutationFn: createCashPool,
    onSuccess: () => {
      toast.success('Cash pool created successfully');
      onSuccess();
    },
    onError: () => toast.error('Failed to create cash pool'),
  });

  const steps = [
    { label: 'Pool Setup', icon: Building2 },
    { label: 'Participants', icon: Users },
    { label: 'Sweep Rules', icon: Settings2 },
    { label: 'Review', icon: Check },
  ];

  const handleFinalSubmit = () => {
    if (!poolData || !sweepRules) return;
    createMutation.mutate({
      poolName: poolData.poolName,
      poolType: poolData.poolType,
      headerAccountId: poolData.headerAccountId,
      customerId: poolData.customerId,
      currency: poolData.currency,
      sweepFrequency: sweepRules.sweepFrequency,
      sweepTime: sweepRules.sweepTime || null,
      minSweepAmount: sweepRules.minSweepAmount,
      targetBalance: sweepRules.targetBalance ?? null,
      thresholdAmount: sweepRules.thresholdAmount ?? null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">Create Cash Pool</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const StepIcon = s.icon;
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              return (
                <div key={s.label} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors',
                        isCompleted && 'bg-primary border-primary text-primary-foreground',
                        isActive && 'border-primary text-primary bg-primary/10',
                        !isActive && !isCompleted && 'border-muted-foreground/30 text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium hidden sm:block',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={cn('flex-1 h-px mx-2', isCompleted ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <WizardStep1
              defaultValues={poolData}
              onNext={(data) => { setPoolData(data); setStep(2); }}
            />
          )}
          {step === 2 && (
            <WizardStep2
              participants={participants}
              onAddParticipant={(p) => setParticipants((prev) => [...prev, p])}
              onRemoveParticipant={(i) => setParticipants((prev) => prev.filter((_, idx) => idx !== i))}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <WizardStep3
              poolType={poolData?.poolType || 'ZERO_BALANCE'}
              defaultValues={sweepRules}
              onNext={(data) => { setSweepRules(data); setStep(4); }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <WizardStep4
              poolData={poolData!}
              participants={participants}
              sweepRules={sweepRules!}
              onSubmit={handleFinalSubmit}
              onBack={() => setStep(3)}
              isSubmitting={createMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wizard Step 1: Pool Setup ───────────────────────────────────────────────

function WizardStep1({
  defaultValues,
  onNext,
}: {
  defaultValues: WizardStep1Data | null;
  onNext: (data: WizardStep1Data) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WizardStep1Data>({
    resolver: zodResolver(wizardStep1Schema),
    defaultValues: defaultValues || { poolType: 'ZERO_BALANCE', currency: 'NGN' },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure the pool header account and type. This determines how participant balances are swept.
      </p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Pool Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          {...register('poolName')}
          placeholder="e.g. Corporate Treasury Pool"
          className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.poolName && 'border-red-500')}
        />
        {errors.poolName && <p className="text-xs text-red-600">{errors.poolName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Pool Type <span className="text-red-500">*</span></label>
        <select
          {...register('poolType')}
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ZERO_BALANCE">Zero Balance Arrangement (ZBA)</option>
          <option value="TARGET_BALANCE">Target Balance</option>
          <option value="THRESHOLD">Threshold Sweep</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Header Account ID <span className="text-red-500">*</span></label>
          <input
            type="number"
            {...register('headerAccountId', { valueAsNumber: true })}
            placeholder="Account ID"
            className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50', errors.headerAccountId && 'border-red-500')}
          />
          {errors.headerAccountId && <p className="text-xs text-red-600">{errors.headerAccountId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Customer ID <span className="text-red-500">*</span></label>
          <input
            type="number"
            {...register('customerId', { valueAsNumber: true })}
            placeholder="Customer ID"
            className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50', errors.customerId && 'border-red-500')}
          />
          {errors.customerId && <p className="text-xs text-red-600">{errors.customerId.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Currency</label>
        <select
          {...register('currency')}
          className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="NGN">NGN - Nigerian Naira</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
        </select>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ── Wizard Step 2: Add Participants ─────────────────────────────────────────

function WizardStep2({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onNext,
  onBack,
}: {
  participants: WizardParticipantData[];
  onAddParticipant: (p: WizardParticipantData) => void;
  onRemoveParticipant: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WizardParticipantData>({
    resolver: zodResolver(wizardParticipantSchema),
    defaultValues: { sweepDirection: 'BIDIRECTIONAL', targetBalance: 0, priority: 100 },
  });

  const handleAdd = (data: WizardParticipantData) => {
    onAddParticipant(data);
    reset({ sweepDirection: 'BIDIRECTIONAL', targetBalance: 0, priority: 100 });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Add participant sub-accounts to the pool. Each participant's balance will be swept according to the configured rules.
      </p>

      {/* Added participants */}
      {participants.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Participants ({participants.length})
          </div>
          {participants.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-card">
              <div>
                <div className="text-sm font-medium">{p.participantName}</div>
                <div className="text-xs text-muted-foreground font-mono">Account ID: {p.accountId}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                    {p.sweepDirection}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    Priority: {p.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveParticipant(i)}
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add participant form */}
      <form onSubmit={handleSubmit(handleAdd)} className="space-y-3 rounded-lg border p-4 bg-muted/20">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Participant</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Account ID</label>
            <input
              type="number"
              {...register('accountId', { valueAsNumber: true })}
              placeholder="Account ID"
              className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50', errors.accountId && 'border-red-500')}
            />
            {errors.accountId && <p className="text-[10px] text-red-600">{errors.accountId.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Participant Name</label>
            <input
              type="text"
              {...register('participantName')}
              placeholder="Name"
              className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.participantName && 'border-red-500')}
            />
            {errors.participantName && <p className="text-[10px] text-red-600">{errors.participantName.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Direction</label>
            <select
              {...register('sweepDirection')}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="BIDIRECTIONAL">Bidirectional</option>
              <option value="INWARD">Inward</option>
              <option value="OUTWARD">Outward</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Target Balance</label>
            <input
              type="number"
              step="1000"
              {...register('targetBalance', { valueAsNumber: true })}
              placeholder="0"
              className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Priority</label>
            <input
              type="number"
              min="1"
              max="999"
              {...register('priority', { valueAsNumber: true })}
              placeholder="100"
              className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add to Pool
        </button>
      </form>

      <div className="flex justify-between pt-2 border-t">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={participants.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Wizard Step 3: Sweep Rules ──────────────────────────────────────────────

function WizardStep3({
  poolType,
  defaultValues,
  onNext,
  onBack,
}: {
  poolType: string;
  defaultValues: WizardSweepRulesData | null;
  onNext: (data: WizardSweepRulesData) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WizardSweepRulesData>({
    resolver: zodResolver(wizardSweepRulesSchema),
    defaultValues: defaultValues || { sweepFrequency: 'EOD', minSweepAmount: 0 },
  });

  const frequency = watch('sweepFrequency');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure the sweep execution rules for this pool.
      </p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Sweep Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {(['REAL_TIME', 'EOD', 'DAILY', 'WEEKLY'] as const).map((freq) => {
            const labels: Record<string, string> = { REAL_TIME: 'Real-time', EOD: 'End of Day', DAILY: 'Daily', WEEKLY: 'Weekly' };
            return (
              <label
                key={freq}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  frequency === freq ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:bg-muted/50',
                )}
              >
                <input type="radio" value={freq} {...register('sweepFrequency')} className="sr-only" />
                {labels[freq]}
              </label>
            );
          })}
        </div>
      </div>

      {(frequency === 'DAILY' || frequency === 'WEEKLY') && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sweep Time</label>
          <input
            type="time"
            {...register('sweepTime')}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Minimum Sweep Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">&#8358;</span>
          <input
            type="number"
            step="1000"
            min="0"
            {...register('minSweepAmount', { valueAsNumber: true })}
            placeholder="0.00"
            className="w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">Sweeps below this amount will be skipped.</p>
      </div>

      {poolType === 'TARGET_BALANCE' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Default Target Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">&#8358;</span>
            <input
              type="number"
              step="1000"
              min="0"
              {...register('targetBalance', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {poolType === 'THRESHOLD' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Threshold Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">&#8358;</span>
            <input
              type="number"
              step="1000"
              min="0"
              {...register('thresholdAmount', { valueAsNumber: true })}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">Funds above this amount will be swept to the header account.</p>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

// ── Wizard Step 4: Review & Submit ──────────────────────────────────────────

function WizardStep4({
  poolData,
  participants,
  sweepRules,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  poolData: WizardStep1Data;
  participants: WizardParticipantData[];
  sweepRules: WizardSweepRulesData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const freqLabels: Record<string, string> = { REAL_TIME: 'Real-time', EOD: 'End of Day', DAILY: 'Daily', WEEKLY: 'Weekly' };
  const typeLabels: Record<string, string> = { ZERO_BALANCE: 'Zero Balance (ZBA)', TARGET_BALANCE: 'Target Balance', THRESHOLD: 'Threshold' };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Review the pool configuration before creating.</p>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pool Details</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{poolData.poolName}</span></div>
          <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{typeLabels[poolData.poolType]}</span></div>
          <div><span className="text-muted-foreground">Header Account:</span> <span className="font-medium font-mono">{poolData.headerAccountId}</span></div>
          <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium font-mono">{poolData.customerId}</span></div>
          <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{poolData.currency}</span></div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants ({participants.length})</div>
        <div className="space-y-1.5">
          {participants.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{p.participantName}</span>
                <span className="text-muted-foreground ml-2 font-mono text-xs">ID: {p.accountId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">{p.sweepDirection}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">P{p.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sweep Rules</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Frequency:</span> <span className="font-medium">{freqLabels[sweepRules.sweepFrequency]}</span></div>
          <div><span className="text-muted-foreground">Min Amount:</span> <span className="font-medium font-mono">{formatMoney(sweepRules.minSweepAmount)}</span></div>
          {sweepRules.sweepTime && <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{sweepRules.sweepTime}</span></div>}
          {sweepRules.targetBalance !== undefined && sweepRules.targetBalance > 0 && (
            <div><span className="text-muted-foreground">Target:</span> <span className="font-medium font-mono">{formatMoney(sweepRules.targetBalance)}</span></div>
          )}
          {sweepRules.thresholdAmount !== undefined && sweepRules.thresholdAmount > 0 && (
            <div><span className="text-muted-foreground">Threshold:</span> <span className="font-medium font-mono">{formatMoney(sweepRules.thresholdAmount)}</span></div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2 border-t">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Create Pool
        </button>
      </div>
    </div>
  );
}

// ── Add Participant Dialog ──────────────────────────────────────────────────

interface AddParticipantDialogProps {
  poolCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddParticipantDialog({ poolCode, onClose, onSuccess }: AddParticipantDialogProps) {
  const addMutation = useAddCashPoolParticipant();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WizardParticipantData>({
    resolver: zodResolver(wizardParticipantSchema),
    defaultValues: { sweepDirection: 'BIDIRECTIONAL', targetBalance: 0, priority: 100 },
  });

  const onSubmit = (data: WizardParticipantData) => {
    addMutation.mutate(
      {
        poolCode,
        data: {
          accountId: data.accountId,
          participantName: data.participantName,
          sweepDirection: data.sweepDirection,
          targetBalance: data.targetBalance,
          priority: data.priority,
        },
      },
      {
        onSuccess: () => { toast.success('Participant added'); onSuccess(); },
        onError: () => toast.error('Failed to add participant'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><UserPlus className="w-4 h-4 text-primary" /></div>
            <h2 className="text-base font-semibold">Add Participant</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Account ID <span className="text-red-500">*</span></label>
              <input type="number" {...register('accountId', { valueAsNumber: true })} placeholder="Account ID"
                className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50', errors.accountId && 'border-red-500')} />
              {errors.accountId && <p className="text-xs text-red-600">{errors.accountId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <input type="text" {...register('participantName')} placeholder="Participant name"
                className={cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', errors.participantName && 'border-red-500')} />
              {errors.participantName && <p className="text-xs text-red-600">{errors.participantName.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Direction</label>
              <select {...register('sweepDirection')} className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="BIDIRECTIONAL">Bidirectional</option>
                <option value="INWARD">Inward</option>
                <option value="OUTWARD">Outward</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Bal.</label>
              <input type="number" step="1000" {...register('targetBalance', { valueAsNumber: true })} placeholder="0"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <input type="number" min="1" max="999" {...register('priority', { valueAsNumber: true })} placeholder="100"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={addMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
              {addMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <UserPlus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pool Detail Slide-over Panel ────────────────────────────────────────────

interface PoolDetailPanelProps {
  pool: CashPool;
  onClose: () => void;
}

function PoolDetailPanel({ pool, onClose }: PoolDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'structure' | 'participants' | 'sweeps' | 'calculator'>('structure');
  const [configParticipant, setConfigParticipant] = useState<CashPoolParticipant | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  const sweepMutation = useSweepCashPool();
  const updateMutation = useUpdateCashPoolParticipant();
  const removeMutation = useRemoveCashPoolParticipant();

  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['accounts', 'cash-pools', pool.poolCode, 'participants'],
    queryFn: () => getParticipants(pool.poolCode),
  });

  const { data: sweeps = [], isLoading: sweepsLoading } = useQuery({
    queryKey: ['sweep-history', pool.poolCode],
    queryFn: () => getSweepHistory(pool.poolCode),
  });

  const handleManualSweep = () => {
    sweepMutation.mutate(pool.poolCode, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sweep-history', pool.poolCode] });
        queryClient.invalidateQueries({ queryKey: ['accounts', 'cash-pools'] });
        toast.success('Manual sweep triggered successfully');
      },
      onError: () => toast.error('Failed to trigger sweep'),
    });
  };

  const handleSaveConfig = (data: Partial<CashPoolParticipant>) => {
    if (!configParticipant) return;
    updateMutation.mutate(
      { poolCode: pool.poolCode, participantId: configParticipant.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['accounts', 'cash-pools', pool.poolCode, 'participants'] });
          toast.success('Sweep configuration updated');
          setTimeout(() => setConfigParticipant(null), 800);
        },
        onError: () => toast.error('Failed to update configuration'),
      },
    );
  };

  const handleRemoveParticipant = (participant: CashPoolParticipant) => {
    removeMutation.mutate(
      { poolCode: pool.poolCode, participantId: participant.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['accounts', 'cash-pools', pool.poolCode, 'participants'] });
          toast.success(`${participant.participantName} removed from pool`);
        },
        onError: () => toast.error('Failed to remove participant'),
      },
    );
  };

  const pendingSweeps = sweeps.filter((s) => s.status === 'PENDING').length;
  const activeParticipants = participants.filter((p) => p.isActive && p.participantRole !== 'HEADER');

  // Participant table columns
  const participantColumns = useMemo<ColumnDef<CashPoolParticipant, unknown>[]>(
    () => [
      {
        accessorKey: 'accountId',
        header: 'Account ID',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountId}</span>,
      },
      {
        accessorKey: 'participantName',
        header: 'Name',
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.participantName}</span>,
      },
      {
        accessorKey: 'targetBalance',
        header: 'Target Balance',
        cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.targetBalance)}</span>,
      },
      {
        accessorKey: 'sweepDirection',
        header: 'Direction',
        cell: ({ row }) => {
          const dirColors: Record<string, string> = {
            BIDIRECTIONAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            INWARD: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            OUTWARD: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          };
          return (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', dirColors[row.original.sweepDirection] || 'bg-gray-100 text-gray-600')}>
              {row.original.sweepDirection}
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.priority}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfigParticipant(row.original)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Configure sweep"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRemoveParticipant(row.original)}
              disabled={removeMutation.isPending}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-60"
              title="Remove participant"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [pool.poolCode, removeMutation.isPending],
  );

  const tabs = [
    { key: 'structure' as const, label: 'Structure', icon: Layers },
    { key: 'participants' as const, label: `Participants (${activeParticipants.length})`, icon: Users },
    { key: 'sweeps' as const, label: 'Sweep History', icon: History },
    { key: 'calculator' as const, label: 'Interest', icon: TrendingUp },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-4xl bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10"><Layers className="w-4 h-4 text-primary" /></div>
            <div>
              <h3 className="text-base font-semibold">{pool.poolName}</h3>
              <p className="text-xs text-muted-foreground">
                {pool.poolCode} &middot; {pool.poolType.replace(/_/g, ' ')} &middot; {pool.currency}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSweep}
              disabled={sweepMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              {sweepMutation.isPending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Zap className="w-3.5 h-3.5" />}
              Sweep Now
            </button>
            <button
              onClick={() => setShowAddParticipant(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Participant
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Pool summary */}
        <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b bg-muted/20 flex-shrink-0">
          <div>
            <div className="text-xs text-muted-foreground">Sweep Frequency</div>
            <div className="text-sm font-semibold">{pool.sweepFrequency.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Participants</div>
            <div className="text-sm font-semibold">{activeParticipants.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pending Sweeps</div>
            <div className="text-sm font-semibold">{pendingSweeps}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Min Sweep</div>
            <div className="text-sm font-semibold font-mono tabular-nums">{formatMoney(pool.minSweepAmount)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5 flex-shrink-0">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
                )}
              >
                <TabIcon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'structure' && (
            participantsLoading ? (
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
            ) : (
              <PoolStructureTree
                pool={pool}
                participants={participants}
                onParticipantClick={(participantId) => {
                  const p = participants.find((x) => x.id === participantId);
                  if (p) setConfigParticipant(p);
                }}
              />
            )
          )}

          {activeTab === 'participants' && (
            participantsLoading ? (
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
            ) : (
              <DataTable
                columns={participantColumns}
                data={activeParticipants}
                enableGlobalFilter
                emptyMessage="No participants in this pool"
                pageSize={10}
              />
            )
          )}

          {activeTab === 'sweeps' && (
            sweepsLoading ? (
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
            ) : (
              <SweepHistoryTable sweeps={sweeps} />
            )
          )}

          {activeTab === 'calculator' && (
            <div className="max-w-md">
              <InterestBenefitCalculator totalBalance={pool.targetBalance || 0} />
            </div>
          )}
        </div>
      </div>

      {/* Sweep config sub-panel */}
      {configParticipant && (
        <div className="fixed right-0 top-0 bottom-0 z-[60] w-full max-w-md bg-background border-l shadow-2xl overflow-y-auto">
          <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><Settings2 className="w-4 h-4 text-primary" /></div>
              <h3 className="text-sm font-semibold">Sweep Configuration</h3>
            </div>
            <button onClick={() => setConfigParticipant(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5">
            {updateMutation.isSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3">
                <p className="text-sm text-green-700 dark:text-green-400">Configuration saved successfully.</p>
              </div>
            )}
            <SweepConfigForm
              participant={configParticipant}
              onSave={handleSaveConfig}
              onCancel={() => setConfigParticipant(null)}
            />
          </div>
        </div>
      )}

      {/* Add participant dialog */}
      {showAddParticipant && (
        <AddParticipantDialog
          poolCode={pool.poolCode}
          onClose={() => setShowAddParticipant(false)}
          onSuccess={() => {
            setShowAddParticipant(false);
            queryClient.invalidateQueries({ queryKey: ['accounts', 'cash-pools', pool.poolCode, 'participants'] });
          }}
        />
      )}
    </>
  );
}

// ── Pool Card ─────────────────────────────────────────────────────────────────

interface PoolCardProps {
  pool: CashPool;
  participantCount: number;
  onClick: () => void;
}

function PoolCard({ pool, participantCount, onClick }: PoolCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left surface-card shadow-sm overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group"
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{pool.poolName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pool.poolCode} &middot; Header Account: <span className="font-mono">{pool.headerAccountId}</span>
              </p>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            pool.isActive
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
          )}>
            {pool.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-3 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Participants</div>
            <div className="text-sm font-semibold mt-0.5">{participantCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pool Type</div>
            <div className="text-sm font-semibold mt-0.5">{pool.poolType.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sweep Frequency</div>
            <div className="text-sm font-semibold mt-0.5">{pool.sweepFrequency.replace(/_/g, ' ')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Currency</div>
            <div className="text-sm font-semibold mt-0.5">{pool.currency}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Min Sweep</div>
            <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{formatMoneyCompact(pool.minSweepAmount)}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CashPoolPage() {
  useEffect(() => { document.title = 'Cash Pooling | CBS'; }, []);
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPool, setSelectedPool] = useState<CashPool | null>(null);

  const { data: pools = [], isLoading } = useQuery({
    queryKey: ['cash-pools'],
    queryFn: getCashPools,
  });

  // Fetch participant counts for each pool
  const participantQueries = useQuery({
    queryKey: ['cash-pools-summary'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        pools.map(async (pool) => {
          try {
            const participants = await getParticipants(pool.poolCode);
            counts[pool.poolCode] = participants.filter((p) => p.isActive && p.participantRole !== 'HEADER').length;
          } catch (err) {
            console.error('Failed to load participants for pool', pool.poolCode, err);
            counts[pool.poolCode] = 0;
          }
        }),
      );
      return counts;
    },
    enabled: pools.length > 0,
  });

  const participantCounts = participantQueries.data || {};

  const handlePoolCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-pools'] });
    setShowWizard(false);
  };

  const totalPools = pools.filter((p) => p.isActive).length;
  const totalParticipants = Object.values(participantCounts).reduce((s, c) => s + c, 0);

  return (
    <div>
      <PageHeader
        title="Cash Pooling"
        subtitle="Manage notional and physical cash pooling arrangements"
        actions={
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Pool
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Dashboard summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Number of Pools" value={totalPools} format="number" icon={Layers} loading={isLoading} />
          <StatCard label="Active Participants" value={totalParticipants} format="number" icon={Users} loading={isLoading || participantQueries.isLoading} />
          <StatCard label="Pending Sweeps" value={0} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Interest Saved MTD" value="--" icon={TrendingUp} loading={isLoading} />
        </div>

        {/* Pool list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No cash pools configured yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a new pool to start managing cash concentration.</p>
            <button
              onClick={() => setShowWizard(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Pool
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pools.map((pool) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                participantCount={participantCounts[pool.poolCode] || 0}
                onClick={() => setSelectedPool(pool)}
              />
            ))}
          </div>
        )}
      </div>

      {showWizard && <CreatePoolWizard onClose={() => setShowWizard(false)} onSuccess={handlePoolCreated} />}
      {selectedPool && <PoolDetailPanel pool={selectedPool} onClose={() => setSelectedPool(null)} />}
    </div>
  );
}
