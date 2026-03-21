import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, ArrowLeft, ArrowRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { useCreateGoal } from '../hooks/useGoals';
import type { AutoDebitFrequency } from '../api/goalApi';
import { apiGet } from '@/lib/api';

// ── Constants ───────────────────────────────────────────────────────────────

const STEP_LABELS = ['Type', 'Amount', 'Timeline', 'Funding', 'Review'];

const GOAL_TEMPLATES = [
  { icon: '🏠', name: 'Home Down Payment', category: 'Home', suggestedRange: [5_000_000, 20_000_000], quickAmounts: [2_000_000, 5_000_000, 10_000_000, 20_000_000], context: 'Average down payment in Lagos: ₦8M–₦15M' },
  { icon: '🎓', name: 'Education Fund', category: 'Education', suggestedRange: [500_000, 5_000_000], quickAmounts: [500_000, 1_000_000, 2_000_000, 5_000_000], context: 'Annual tuition at top Nigerian universities: ₦500K–₦3M' },
  { icon: '🚗', name: 'New Vehicle', category: 'Vehicle', suggestedRange: [2_000_000, 15_000_000], quickAmounts: [2_000_000, 5_000_000, 8_000_000, 15_000_000], context: 'New sedan range: ₦5M–₦12M' },
  { icon: '✈️', name: 'Dream Trip', category: 'Travel', suggestedRange: [200_000, 2_000_000], quickAmounts: [200_000, 500_000, 1_000_000, 2_000_000], context: 'International holiday: ₦300K–₦1.5M' },
  { icon: '🏥', name: 'Health Fund', category: 'Medical', suggestedRange: [200_000, 2_000_000], quickAmounts: [200_000, 500_000, 1_000_000, 2_000_000], context: 'HMO premium + emergency buffer' },
  { icon: '💍', name: 'Wedding Fund', category: 'Wedding', suggestedRange: [1_000_000, 10_000_000], quickAmounts: [1_000_000, 3_000_000, 5_000_000, 10_000_000], context: 'Average Nigerian wedding: ₦2M–₦8M' },
  { icon: '🛡️', name: 'Emergency Fund', category: 'Emergency', suggestedRange: [500_000, 5_000_000], quickAmounts: [500_000, 1_500_000, 3_000_000, 5_000_000], context: 'Recommended: 3–6 months of expenses' },
  { icon: '🎯', name: 'Custom Goal', category: 'Custom', suggestedRange: [10_000, 100_000_000], quickAmounts: [100_000, 500_000, 1_000_000, 5_000_000], context: 'Set your own target' },
];

const ALL_ICONS = ['🏠', '🎓', '🚗', '✈️', '🏥', '💍', '🛡️', '🎯', '💰', '📱', '🏖️', '👶', '🎸', '🏋️', '📚', '🎮', '🐕', '🌍', '💻', '🏪', '🎭', '⛵', '🎨', '🧘'];

interface SourceAccount { id: number; accountNumber: string; accountName: string; availableBalance: number; currencyCode: string; status: string; customerId: number; }

// ── Stepper ─────────────────────────────────────────────────────────────────

function WizardStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2',
                done ? 'bg-green-500 border-green-500 text-white' : active ? 'border-primary text-primary bg-background ring-2 ring-primary/20' : 'border-muted-foreground/30 text-muted-foreground bg-background')}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('text-[10px] whitespace-nowrap', active ? 'text-primary font-semibold' : done ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 mx-1.5', done ? 'bg-green-500' : 'bg-muted')} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function NewGoalPage() {
  useEffect(() => { document.title = 'New Savings Goal | CBS'; }, []);
  const navigate = useNavigate();
  const createGoal = useCreateGoal();
  const [step, setStep] = useState(0);

  // Form state
  const [goalName, setGoalName] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalIcon, setGoalIcon] = useState('🎯');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof GOAL_TEMPLATES[0] | null>(null);
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState<number>(0);
  const [autoDebitEnabled, setAutoDebitEnabled] = useState(true);
  const [autoDebitAmount, setAutoDebitAmount] = useState(0);
  const [autoDebitFreq, setAutoDebitFreq] = useState<AutoDebitFrequency>('MONTHLY');
  const [isLocked, setIsLocked] = useState(false);
  const [allowWithdrawalBeforeTarget, setAllowWithdrawalBeforeTarget] = useState(true);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-for-goals'],
    queryFn: () => apiGet<SourceAccount[]>('/api/v1/accounts'),
  });

  // Calculations
  const monthsToGoal = useMemo(() => {
    if (!targetDate) return 0;
    const target = new Date(targetDate);
    const now = new Date();
    return Math.max(1, Math.round((target.getTime() - now.getTime()) / (30.44 * 86400000)));
  }, [targetDate]);

  const monthlyRequired = targetAmount > 0 && monthsToGoal > 0 ? Math.ceil(targetAmount / monthsToGoal) : 0;
  const weeklyRequired = monthlyRequired > 0 ? Math.ceil(monthlyRequired / 4.33) : 0;
  const dailyRequired = monthlyRequired > 0 ? Math.ceil(monthlyRequired / 30.44) : 0;

  useEffect(() => { if (monthlyRequired > 0) setAutoDebitAmount(monthlyRequired); }, [monthlyRequired]);

  const selectedAccount = accounts.find(a => a.id === accountId);

  const handleCreate = () => {
    createGoal.mutate({
      accountId,
      goalName,
      goalDescription: goalDescription || undefined,
      goalIcon,
      targetAmount,
      targetDate: targetDate || undefined,
      autoDebitEnabled,
      ...(autoDebitEnabled ? {
        autoDebitAmount,
        autoDebitFrequency: autoDebitFreq,
        autoDebitAccountId: accountId,
      } : {}),
      isLocked,
      allowWithdrawalBeforeTarget,
      currencyCode: selectedAccount?.currencyCode,
    }, {
      onSuccess: (goal) => { toast.success('Goal created!'); navigate(`/accounts/goals/${goal.id}`); },
      onError: () => toast.error('Failed to create goal'),
    });
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Cancel'}
        </button>
        <h1 className="text-lg font-semibold">Create New Savings Goal</h1>
        <div className="w-16" />
      </div>

      <WizardStepper steps={STEP_LABELS} current={step} />

      <div className="bg-card rounded-xl border p-6">
        {/* ── Step 1: Type ──────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">What are you saving for?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GOAL_TEMPLATES.map(t => (
                <button key={t.category} onClick={() => { setSelectedTemplate(t); setGoalName(t.name); setGoalIcon(t.icon); }}
                  className={cn('p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50',
                    selectedTemplate?.category === t.category ? 'border-primary bg-primary/5' : 'border-border')}>
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="text-sm font-semibold">{t.category}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{formatMoney(t.suggestedRange[0])}–{formatMoney(t.suggestedRange[1])}</div>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowIconPicker(!showIconPicker)} className="text-3xl hover:scale-110 transition-transform" title="Change icon">{goalIcon}</button>
                <input value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Goal name" className={cn(fc, 'flex-1 text-base font-medium')} maxLength={100} />
              </div>
              <input value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="Description (optional)" className={fc} />
              {showIconPicker && (
                <div className="grid grid-cols-8 gap-2 p-3 rounded-lg border bg-muted/20">
                  {ALL_ICONS.map(icon => (
                    <button key={icon} onClick={() => { setGoalIcon(icon); setShowIconPicker(false); }}
                      className={cn('text-2xl p-1 rounded hover:bg-primary/10 transition-colors', goalIcon === icon && 'bg-primary/20 ring-2 ring-primary')}>
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(1)} disabled={!goalName}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Amount ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">How much do you need?</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target Amount</label>
              <input type="number" value={targetAmount || ''} onChange={e => setTargetAmount(Number(e.target.value))}
                placeholder="0" className={cn(fc, 'text-2xl font-bold font-mono')} min={0.01} step="0.01" />
            </div>
            {selectedTemplate && (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.quickAmounts.map(a => (
                    <button key={a} onClick={() => setTargetAmount(a)}
                      className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                        targetAmount === a ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                      {formatMoney(a)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">{selectedTemplate.context}</p>
              </>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep(2)} disabled={targetAmount < 0.01}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Timeline ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">When do you need it?</h3>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              min={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)} className={fc} />
            <div className="flex flex-wrap gap-2">
              {[{ label: '6 months', months: 6 }, { label: '1 year', months: 12 }, { label: '2 years', months: 24 }, { label: '3 years', months: 36 }].map(t => {
                const d = new Date(); d.setMonth(d.getMonth() + t.months);
                return (
                  <button key={t.label} onClick={() => setTargetDate(d.toISOString().slice(0, 10))}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">{t.label}</button>
                );
              })}
            </div>
            {targetDate && targetAmount > 0 && (
              <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-primary">Savings Calculator</p>
                <p className="text-sm">At {formatMoney(targetAmount)} in {monthsToGoal} months, you need:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-card border p-3 text-center">
                    <div className="text-lg font-bold font-mono">{formatMoney(monthlyRequired)}</div>
                    <div className="text-[10px] text-muted-foreground">per month</div>
                  </div>
                  <div className="rounded-lg bg-card border p-3 text-center">
                    <div className="text-lg font-bold font-mono">{formatMoney(weeklyRequired)}</div>
                    <div className="text-[10px] text-muted-foreground">per week</div>
                  </div>
                  <div className="rounded-lg bg-card border p-3 text-center">
                    <div className="text-lg font-bold font-mono">{formatMoney(dailyRequired)}</div>
                    <div className="text-[10px] text-muted-foreground">per day</div>
                  </div>
                </div>
              </div>
            )}

            {/* Lock and withdrawal settings */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground">Goal Settings</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isLocked} onChange={e => setIsLocked(e.target.checked)}
                  className="rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">Lock goal</span>
                  <p className="text-xs text-muted-foreground">Prevent any withdrawals until unlocked</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowWithdrawalBeforeTarget} onChange={e => setAllowWithdrawalBeforeTarget(e.target.checked)}
                  className="rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">Allow early withdrawal</span>
                  <p className="text-xs text-muted-foreground">Allow withdrawals before reaching the target</p>
                </div>
              </label>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep(3)}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Funding ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">How will you fund it?</h3>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Source Account</p>
              {(accounts as SourceAccount[]).map(a => (
                <button key={a.id} onClick={() => setAccountId(a.id)}
                  className={cn('w-full flex items-center justify-between p-4 rounded-lg border-2 text-left transition-all',
                    accountId === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                  <div><div className="text-sm font-medium">{a.accountName}</div><div className="text-xs text-muted-foreground font-mono">****{a.accountNumber?.slice(-4)}</div></div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold">{formatMoney(a.availableBalance)}</div>
                    <div className="text-[10px] text-muted-foreground">{a.currencyCode}</div>
                  </div>
                </button>
              ))}
              {accounts.length === 0 && <p className="text-sm text-muted-foreground py-4">No accounts found.</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Funding Method</p>
              <button onClick={() => setAutoDebitEnabled(true)}
                className={cn('w-full p-4 rounded-lg border-2 text-left transition-all',
                  autoDebitEnabled ? 'border-primary bg-primary/5' : 'border-border')}>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg">🤖</span><span className="text-sm font-semibold">Auto-Debit (Recommended)</span></div>
                <p className="text-xs text-muted-foreground">Set it and forget it — we'll automatically save for you</p>
                {autoDebitEnabled && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Amount</label>
                      <input type="number" value={autoDebitAmount || ''} onChange={e => setAutoDebitAmount(Number(e.target.value))} className={cn(fc, 'font-mono')} min={0.01} step="0.01" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Frequency</label>
                      <select value={autoDebitFreq} onChange={e => setAutoDebitFreq(e.target.value as AutoDebitFrequency)} className={fc}>
                        <option value="MONTHLY">Monthly</option><option value="BI_WEEKLY">Bi-Weekly</option><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option>
                      </select></div>
                  </div>
                )}
              </button>
              <button onClick={() => setAutoDebitEnabled(false)}
                className={cn('w-full p-4 rounded-lg border-2 text-left transition-all',
                  !autoDebitEnabled ? 'border-primary bg-primary/5' : 'border-border')}>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg">💵</span><span className="text-sm font-semibold">Manual</span></div>
                <p className="text-xs text-muted-foreground">Contribute whenever you want, on your own schedule</p>
                <p className="text-[10px] text-amber-600 mt-1">Manual savings are 3x less likely to reach the goal on time</p>
              </button>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep(4)} disabled={!accountId}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Review ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-xl border p-6 bg-muted/20 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{goalIcon}</span>
                <div><h3 className="text-lg font-bold">{goalName}</h3>
                  {goalDescription && <p className="text-xs text-muted-foreground">{goalDescription}</p>}
                  <p className="text-xs text-muted-foreground">{selectedTemplate?.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Target</p><p className="font-bold font-mono text-lg">{formatMoney(targetAmount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Timeline</p><p className="font-medium">{targetDate ? `${monthsToGoal} months (${targetDate})` : 'No deadline'}</p></div>
                <div><p className="text-xs text-muted-foreground">Funding</p><p className="font-medium">{autoDebitEnabled ? `Auto-debit ${formatMoney(autoDebitAmount)}/${autoDebitFreq.toLowerCase().replace('_', '-')}` : 'Manual'}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="font-medium font-mono">****{selectedAccount?.accountNumber?.slice(-4) || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Locked</p><p className="font-medium">{isLocked ? 'Yes' : 'No'}</p></div>
                <div><p className="text-xs text-muted-foreground">Early Withdrawal</p><p className="font-medium">{allowWithdrawalBeforeTarget ? 'Allowed' : 'Not allowed'}</p></div>
              </div>
              {monthsToGoal > 0 && (
                <div className="border-t pt-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Milestones</p>
                  {[25, 50, 75, 100].map(pct => {
                    const milestone = (targetAmount * pct) / 100;
                    const monthsToMilestone = Math.ceil((pct / 100) * monthsToGoal);
                    const d = new Date(); d.setMonth(d.getMonth() + monthsToMilestone);
                    return (
                      <div key={pct} className="flex items-center justify-between text-xs">
                        <span>{pct}% ({formatMoney(milestone)})</span>
                        <span className="text-muted-foreground">~{d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={handleCreate} disabled={createGoal.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                Create Goal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
