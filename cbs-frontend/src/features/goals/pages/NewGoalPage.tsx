import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SavingsCalculator } from '../components/SavingsCalculator';
import { AutoDebitConfigForm } from '../components/AutoDebitConfigForm';
import { createGoal } from '../api/goalApi';
import type { AutoDebitConfig } from '../api/goalApi';
import { cn } from '@/lib/utils';

const GOAL_EMOJIS = ['🏠', '📚', '✈️', '🚗', '💍', '🏥', '💻', '🎓'];

const MOCK_ACCOUNTS = [
  { id: 'acc-001', number: '0123456789', name: 'Primary Savings', balance: 5_200_000 },
  { id: 'acc-002', number: '0987654321', name: 'Secondary Current', balance: 1_800_000 },
];

// Step 1 schema
const step1Schema = z.object({
  name: z.string().min(2, 'Goal name must be at least 2 characters'),
  icon: z.string().min(1, 'Select an icon'),
  targetAmount: z.coerce.number().min(1000, 'Minimum target is ₦1,000'),
});

// Step 2 schema
const step2Schema = z.object({
  targetDate: z.string().min(1, 'Select a target date'),
});

// Step 3 schema
const step3Schema = z.object({
  sourceAccountId: z.string().min(1, 'Select a source account'),
  fundingMethod: z.enum(['MANUAL', 'AUTO_DEBIT']),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

const STEPS = ['Goal Info', 'Timeline', 'Funding'];

export function NewGoalPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState('🏠');
  const [autoDebitConfig, setAutoDebitConfig] = useState<AutoDebitConfig | undefined>();

  // Collected form data across steps
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Values | null>(null);

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', icon: '🏠', targetAmount: undefined },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { targetDate: '' },
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: { sourceAccountId: '', fundingMethod: 'MANUAL' },
  });

  const fundingMethod = step3Form.watch('fundingMethod');

  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => navigate('/accounts/goals'),
  });

  function goNext() {
    if (step === 0) {
      step1Form.handleSubmit((data) => {
        setStep1Data({ ...data, icon: selectedIcon });
        setStep(1);
      })();
    } else if (step === 1) {
      step2Form.handleSubmit((data) => {
        setStep2Data(data);
        setStep(2);
      })();
    }
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSubmit() {
    step3Form.handleSubmit((step3Data) => {
      if (!step1Data || !step2Data) return;

      createMutation.mutate({
        name: step1Data.name,
        icon: step1Data.icon,
        targetAmount: step1Data.targetAmount,
        targetDate: step2Data.targetDate,
        sourceAccountId: step3Data.sourceAccountId,
        sourceAccountNumber:
          MOCK_ACCOUNTS.find((a) => a.id === step3Data.sourceAccountId)?.number ?? '',
        fundingMethod: step3Data.fundingMethod,
        autoDebit: step3Data.fundingMethod === 'AUTO_DEBIT' ? autoDebitConfig : undefined,
      });
    })();
  }

  return (
    <>
      <PageHeader
        title="Create Savings Goal"
        subtitle="Set up a new goal-based savings plan"
        backTo="/accounts/goals"
      />

      <div className="page-container max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                    i < step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : i === step
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    i === step ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                    i < step ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Goal Info */}
        {step === 0 && (
          <div className="bg-card rounded-xl border p-6 space-y-5">
            <h2 className="text-base font-semibold">Goal Information</h2>

            {/* Icon selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Choose an Icon</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { setSelectedIcon(emoji); step1Form.setValue('icon', emoji); }}
                    className={cn(
                      'w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 transition-all hover:scale-110',
                      selectedIcon === emoji
                        ? 'border-primary bg-primary/10 scale-110'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Goal Name <span className="text-red-500">*</span>
              </label>
              <input
                {...step1Form.register('name')}
                placeholder="e.g. New House, Family Vacation..."
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  step1Form.formState.errors.name && 'border-red-500',
                )}
              />
              {step1Form.formState.errors.name && (
                <p className="text-xs text-red-500 mt-0.5">{step1Form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Target Amount */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Target Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₦</span>
                <input
                  type="number"
                  {...step1Form.register('targetAmount')}
                  placeholder="5,000,000"
                  className={cn(
                    'w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                    step1Form.formState.errors.targetAmount && 'border-red-500',
                  )}
                />
              </div>
              {step1Form.formState.errors.targetAmount && (
                <p className="text-xs text-red-500 mt-0.5">{step1Form.formState.errors.targetAmount.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Timeline */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 space-y-5">
            <h2 className="text-base font-semibold">Set Your Timeline</h2>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Target Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...step2Form.register('targetDate')}
                min={new Date().toISOString().split('T')[0]}
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  step2Form.formState.errors.targetDate && 'border-red-500',
                )}
              />
              {step2Form.formState.errors.targetDate && (
                <p className="text-xs text-red-500 mt-0.5">{step2Form.formState.errors.targetDate.message}</p>
              )}
            </div>

            <SavingsCalculator
              targetAmount={step1Data?.targetAmount}
              targetDate={step2Form.watch('targetDate')}
              readOnly
            />
          </div>
        )}

        {/* Step 3: Funding */}
        {step === 2 && (
          <div className="bg-card rounded-xl border p-6 space-y-5">
            <h2 className="text-base font-semibold">Funding Configuration</h2>

            {/* Source account */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Source Account <span className="text-red-500">*</span>
              </label>
              <select
                {...step3Form.register('sourceAccountId')}
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  step3Form.formState.errors.sourceAccountId && 'border-red-500',
                )}
              >
                <option value="">Select account...</option>
                {MOCK_ACCOUNTS.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.number} – {acc.name} (₦{acc.balance.toLocaleString()})
                  </option>
                ))}
              </select>
              {step3Form.formState.errors.sourceAccountId && (
                <p className="text-xs text-red-500 mt-0.5">{step3Form.formState.errors.sourceAccountId.message}</p>
              )}
            </div>

            {/* Funding method */}
            <div>
              <label className="text-sm font-medium mb-2 block">Funding Method</label>
              <div className="grid grid-cols-2 gap-3">
                {(['MANUAL', 'AUTO_DEBIT'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => step3Form.setValue('fundingMethod', method)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      fundingMethod === method
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <div className="font-semibold text-sm">{method === 'MANUAL' ? 'Manual' : 'Auto-Debit'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {method === 'MANUAL' ? 'Contribute at your own pace' : 'Set automatic recurring debits'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-debit config */}
            {fundingMethod === 'AUTO_DEBIT' && (
              <div className="border rounded-xl p-4 bg-muted/20">
                <AutoDebitConfigForm
                  config={autoDebitConfig}
                  onSave={(config) => {
                    setAutoDebitConfig(config);
                  }}
                  onCancel={() => {}}
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" />
              Create Goal
            </button>
          )}
        </div>
      </div>
    </>
  );
}
