import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, Loader2, ChevronRight, Zap, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import { previewCharge, chargeFee, type PreviewChargeResult } from '../api/feeApi';

const schema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
});

type FormValues = z.infer<typeof schema>;

const EVENT_GROUPS = [
  { category: 'Account', events: [
    { value: 'ACCOUNT_MAINTENANCE', label: 'Account Maintenance' },
    { value: 'ACCOUNT_CLOSURE', label: 'Account Closure' },
    { value: 'STATEMENT_REQUEST', label: 'Statement Request' },
  ]},
  { category: 'Card', events: [
    { value: 'ATM_WITHDRAWAL', label: 'ATM Withdrawal' },
    { value: 'CARD_ISSUANCE', label: 'Card Issuance' },
    { value: 'CARD_REPLACEMENT', label: 'Card Replacement' },
  ]},
  { category: 'Transfer', events: [
    { value: 'TRANSFER', label: 'Interbank Transfer' },
    { value: 'INTRA_BANK_TRANSFER', label: 'Intra-Bank Transfer' },
    { value: 'INTERNATIONAL_TRANSFER', label: 'International Transfer' },
  ]},
  { category: 'Loan', events: [
    { value: 'LOAN_DISBURSEMENT', label: 'Loan Disbursement' },
    { value: 'LOAN_PROCESSING', label: 'Loan Processing' },
  ]},
  { category: 'Trade', events: [
    { value: 'LC_ISSUANCE', label: 'LC Issuance' },
    { value: 'BG_ISSUANCE', label: 'Bank Guarantee' },
  ]},
];

const HISTORY_KEY = 'fee-calc-history';
interface HistoryEntry { customerId: string; eventType: string; amount: number; total: number; timestamp: number }
function loadHistory(): HistoryEntry[] { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]').slice(0, 5); } catch { return []; } }
function saveToHistory(entry: HistoryEntry) { const h = loadHistory().filter((x) => !(x.eventType === entry.eventType && x.amount === entry.amount)); h.unshift(entry); localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 5))); }

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
const labelCls = 'block text-sm font-medium mb-1';
const errorCls = 'mt-1 text-xs text-destructive';

interface FeePreviewCalculatorProps {
  accountId?: string;
  feeCode?: string;
}

export function FeePreviewCalculator({ accountId, feeCode }: FeePreviewCalculatorProps) {
  const { data: customerOptions = [] } = useQuery({
    queryKey: ['customer-selector'],
    queryFn: () => apiGet<{ value: string; label: string }[]>('/api/v1/customers/selector').catch(() => []),
    staleTime: 5 * 60_000,
  });

  const [result, setResult] = useState<PreviewChargeResult | null>(null);
  const [compareResult, setCompareResult] = useState<PreviewChargeResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showCharge, setShowCharge] = useState(false);
  const [charging, setCharging] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: accountId ?? '', eventType: '', amount: 0 },
  });

  const currentEvent = watch('eventType');

  const onSubmit = async (values: FormValues) => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await previewCharge(values.customerId, values.eventType, values.amount);
      setResult(res);
      const entry = { customerId: values.customerId, eventType: values.eventType, amount: values.amount, total: res.totalCharge, timestamp: Date.now() };
      saveToHistory(entry);
      setHistory(loadHistory());
    } catch {
      setError('Failed to calculate fees. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const runComparison = async (amount: number) => {
    if (!currentEvent || !amount) return;
    try {
      const res = await previewCharge('cust-001', currentEvent, amount);
      setCompareResult(res);
    } catch { /* ignore */ }
  };

  const handleCharge = async () => {
    if (!result || !result.applicableFees.length) return;
    setCharging(true);
    try {
      for (const fee of result.applicableFees) {
        await chargeFee(fee.feeId, accountId ?? '0', result.transactionAmount);
      }
      toast.success(`${formatMoney(result.totalCharge)} charged successfully`);
      setShowCharge(false);
    } catch {
      toast.error('Failed to charge fee');
    } finally {
      setCharging(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Fee Preview Calculator</h3>
            <p className="text-xs text-muted-foreground">Calculate applicable fees before transaction</p>
          </div>
        </div>
        <button onClick={() => setCompareMode(!compareMode)}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            compareMode ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted')}>
          <ArrowRightLeft className="w-3.5 h-3.5" /> Compare
        </button>
      </div>

      <div className="p-5">
        {/* Calculation history pills */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {history.map((h, i) => (
              <button key={i} onClick={() => { setValue('customerId', h.customerId); setValue('eventType', h.eventType); setValue('amount', h.amount); }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[10px] font-mono text-muted-foreground hover:bg-muted/80 transition-colors">
                <RotateCcw className="w-2.5 h-2.5" />
                {formatMoney(h.amount)} {h.eventType.replace(/_/g, ' ').toLowerCase()} → {formatMoney(h.total)}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Customer</label>
              <select {...register('customerId')} className={inputCls}>
                <option value="">Select customer...</option>
                {customerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors.customerId && <p className={errorCls}>{errors.customerId.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Event Type</label>
              <select {...register('eventType')} className={inputCls}>
                <option value="">Select event...</option>
                {EVENT_GROUPS.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.events.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </optgroup>
                ))}
              </select>
              {errors.eventType && <p className={errorCls}>{errors.eventType.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Transaction Amount (₦)</label>
              <input type="number" min={0} step={0.01} {...register('amount', { valueAsNumber: true })} placeholder="0.00" className={inputCls} />
              {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isCalculating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Calculate
            </button>
          </div>

          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>}
        </form>

        {/* Results */}
        {result && (
          <div className={cn('mt-6', compareMode ? 'grid grid-cols-2 gap-6' : '')}>
            <ResultColumn result={result} title="Current Fees" onCharge={accountId ? () => setShowCharge(true) : undefined} />
            {compareMode && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">What-If Scenario</p>
                <input type="number" placeholder="Compare with different amount…" onChange={(e) => runComparison(Number(e.target.value))}
                  className={cn(inputCls, 'border-dashed')} />
                {compareResult ? (
                  <ResultColumn result={compareResult} title="Proposed" compareWith={result} />
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Enter an amount to compare</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Charge dialog */}
        {showCharge && result && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCharge(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
                <h3 className="font-semibold">Confirm Fee Charge</h3>
                <p className="text-sm text-muted-foreground">
                  Charge <span className="font-bold text-foreground">{formatMoney(result.totalCharge)}</span> to account <span className="font-mono">{accountId}</span>?
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCharge(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                  <button onClick={handleCharge} disabled={charging}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {charging && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Zap className="w-4 h-4" /> Charge Now
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultColumn({ result, title, onCharge, compareWith }: {
  result: PreviewChargeResult; title: string; onCharge?: () => void; compareWith?: PreviewChargeResult;
}) {
  return (
    <div className="space-y-3">
      <div className="h-px bg-border" />
      <p className="text-sm font-semibold">{title}</p>
      {result.applicableFees.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No applicable fees</p>
      ) : (
        <div className="space-y-2">
          {result.applicableFees.map((fee) => {
            const compFee = compareWith?.applicableFees.find((f) => f.feeId === fee.feeId);
            const diff = compFee ? fee.calculatedAmount - compFee.calculatedAmount : 0;
            return (
              <div key={fee.feeId} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{fee.feeName}</p>
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(fee.calculatedAmount)}</span>
                </div>
                {fee.breakdown && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    <span>{fee.breakdown}</span>
                  </div>
                )}
                {fee.vatAmount > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>VAT</span><span>+ {formatMoney(fee.vatAmount)}</span>
                  </div>
                )}
                {diff !== 0 && (
                  <div className={cn('text-xs font-medium', diff > 0 ? 'text-red-600' : 'text-green-600')}>
                    {diff > 0 ? '+' : ''}{formatMoney(diff)} vs current
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {result.applicableFees.length > 0 && (
        <div className="rounded-xl border bg-primary/5 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Fees</span>
            <span className="tabular-nums">{formatMoney(result.totalFees)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total VAT</span>
            <span className="tabular-nums">{formatMoney(result.totalVat)}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total Charge</span>
            <span className="text-base font-bold text-primary tabular-nums">{formatMoney(result.totalCharge)}</span>
          </div>
          {onCharge && (
            <button onClick={onCharge}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
              <Zap className="w-4 h-4" /> Charge This Fee
            </button>
          )}
        </div>
      )}
    </div>
  );
}
