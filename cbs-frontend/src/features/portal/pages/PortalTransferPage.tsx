import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, ArrowLeft, ArrowRight, Loader2, AlertTriangle,
  Send, Shield, Download, Search, User, Building2,
} from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { portalApi, type PortalAccount, type PortalBeneficiary } from '../api/portalApi';

type Step = 'form' | 'review' | 'otp' | 'processing' | 'success' | 'failure';

interface TransferForm {
  fromAccountId: number;
  fromAccountNumber: string;
  toAccountNumber: string;
  beneficiaryName: string;
  bankCode: string;
  amount: number;
  narration: string;
}

// ─── OTP Panel ──────────────────────────────────────────────────────────────

function OtpPanel({ sessionId, onVerified, onBack }: { sessionId: string; onVerified: () => void; onBack: () => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const verifyMutation = useMutation({
    mutationFn: () => portalApi.verifyOtp(sessionId, digits.join('')),
    onSuccess: (result) => {
      if ((result as Record<string, unknown>).valid) {
        onVerified();
      } else {
        setError('Invalid OTP. Please try again.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    },
    onError: () => setError('Verification failed. Please try again.'),
  });

  const handleDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newDigits.every((d) => d) && newDigits.join('').length === 6) {
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const mm = Math.floor(countdown / 60);
  const ss = countdown % 60;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Enter OTP</h1>
        <p className="text-sm text-muted-foreground mt-1">A 6-digit code has been sent to your registered phone</p>
      </div>

      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn('w-12 h-14 border-2 rounded-xl text-center text-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors',
              error ? 'border-red-400' : d ? 'border-primary' : 'border-border')}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}

      <div className="text-center text-sm text-muted-foreground">
        {countdown > 0 ? (
          <span>Code expires in {mm}:{ss.toString().padStart(2, '0')}</span>
        ) : (
          <span className="text-red-600">OTP expired</span>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
        </button>
        <button onClick={() => verifyMutation.mutate()} disabled={digits.join('').length < 6 || verifyMutation.isPending || countdown <= 0}
          className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {verifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          Verify
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PortalTransferPage() {
  useEffect(() => { document.title = 'Transfer Money | BellBank'; }, []);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<TransferForm>({ fromAccountId: 0, fromAccountNumber: '', toAccountNumber: '', beneficiaryName: '', bankCode: '000', amount: 0, narration: '' });
  const [otpSessionId, setOtpSessionId] = useState('');
  const [transferResult, setTransferResult] = useState<Record<string, unknown> | null>(null);
  const [nameEnquiryLoading, setNameEnquiryLoading] = useState(false);
  const [idempotencyKey] = useState(() => `PTR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const { data: accounts = [] } = useQuery({ queryKey: ['portal', 'accounts'], queryFn: () => portalApi.getAccounts() });
  const { data: beneficiaries = [] } = useQuery({ queryKey: ['portal', 'beneficiaries'], queryFn: () => portalApi.getBeneficiaries() });
  const { data: limits } = useQuery({ queryKey: ['portal', 'transfer-limits'], queryFn: () => portalApi.getTransferLimits() });

  const selectedAccount = accounts.find((a) => a.id === form.fromAccountId);

  const update = useCallback((field: keyof TransferForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Name enquiry
  const handleNameEnquiry = async () => {
    if (form.toAccountNumber.length < 10) return;
    setNameEnquiryLoading(true);
    try {
      const result = await portalApi.validateTransfer(form.toAccountNumber, form.bankCode);
      const data = result as Record<string, unknown>;
      if (data.found) {
        update('beneficiaryName', String(data.accountName ?? ''));
        toast.success(`Account: ${data.accountName}`);
      } else {
        toast.error(String(data.message ?? 'Account not found'));
      }
    } catch { toast.error('Name enquiry failed'); }
    finally { setNameEnquiryLoading(false); }
  };

  // Select beneficiary
  const selectBeneficiary = (b: PortalBeneficiary) => {
    setForm((prev) => ({ ...prev, toAccountNumber: b.accountNumber, beneficiaryName: b.name, bankCode: b.bankCode || '000' }));
  };

  // Send OTP
  const sendOtpMutation = useMutation({
    mutationFn: () => portalApi.sendOtp(form.fromAccountId),
    onSuccess: (result) => {
      const data = result as Record<string, unknown>;
      setOtpSessionId(String(data.sessionId));
      setStep('otp');
      toast.success(`OTP sent to ${data.maskedPhone}`);
    },
    onError: () => toast.error('Failed to send OTP'),
  });

  // Execute transfer
  const transferMutation = useMutation({
    mutationFn: () => {
      const creditAccount = accounts.find((a) => a.accountNumber === form.toAccountNumber);
      return portalApi.executeInternalTransfer({
        debitAccountId: form.fromAccountId,
        creditAccountId: creditAccount?.id ?? 0,
        amount: form.amount,
        narration: form.narration || 'Portal transfer',
        idempotencyKey,
      });
    },
    onSuccess: (result) => {
      setTransferResult(result as Record<string, unknown>);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['portal'] });
      toast.success('Transfer successful!');
    },
    onError: () => {
      setStep('failure');
      toast.error('Transfer failed');
    },
  });

  const handleProceedToOtp = () => {
    const otpThreshold = (limits as Record<string, number>)?.otpThreshold ?? 50000;
    if (form.amount > otpThreshold) {
      sendOtpMutation.mutate();
    } else {
      // Below threshold — skip OTP
      setStep('processing');
      transferMutation.mutate();
    }
  };

  const handleOtpVerified = () => {
    setStep('processing');
    transferMutation.mutate();
  };

  const handleNewTransfer = () => {
    setStep('form');
    setForm({ fromAccountId: accounts[0]?.id ?? 0, fromAccountNumber: accounts[0]?.accountNumber ?? '', toAccountNumber: '', beneficiaryName: '', bankCode: '000', amount: 0, narration: '' });
    setTransferResult(null);
  };

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !form.fromAccountId) {
      setForm((prev) => ({ ...prev, fromAccountId: accounts[0].id, fromAccountNumber: accounts[0].accountNumber }));
    }
  }, [accounts, form.fromAccountId]);

  // ── Success ──
  if (step === 'success' && transferResult) {
    return (
      <div className="max-w-md mx-auto text-center py-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-green-700">Transfer Successful!</h2>
          <p className="text-sm text-muted-foreground mt-1">{formatMoney(form.amount, 'NGN')} sent to {form.beneficiaryName}</p>
        </div>

        <div className="rounded-xl border bg-card divide-y text-sm">
          <div className="px-5 py-3 flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{String(transferResult.reference ?? '')}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-muted-foreground">From</span><span className="font-mono">{form.fromAccountNumber}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-muted-foreground">To</span><span className="font-mono">{form.toAccountNumber}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-bold">{formatMoney(form.amount, 'NGN')}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-green-600 font-medium">{String(transferResult.status)}</span></div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={handleNewTransfer} className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">
            <Send className="w-4 h-4" /> New Transfer
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">
            <Download className="w-4 h-4" /> Download Receipt
          </button>
        </div>
      </div>
    );
  }

  // ── Failure ──
  if (step === 'failure') {
    return (
      <div className="max-w-md mx-auto text-center py-8 space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-700">Transfer Failed</h2>
          <p className="text-sm text-muted-foreground mt-1">The transfer could not be completed. Please try again.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setStep('form')} className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">Try Again</button>
        </div>
      </div>
    );
  }

  // ── Processing ──
  if (step === 'processing') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <h2 className="text-lg font-semibold">Processing Transfer...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we complete your transaction</p>
      </div>
    );
  }

  // ── OTP ──
  if (step === 'otp') {
    return <OtpPanel sessionId={otpSessionId} onVerified={handleOtpVerified} onBack={() => setStep('review')} />;
  }

  // ── Review ──
  if (step === 'review') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Review Transfer</h1>
        <div className="rounded-xl border bg-card divide-y">
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">From</span><span className="text-sm font-mono">{selectedAccount?.accountName} ({form.fromAccountNumber})</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">To</span><span className="text-sm font-mono">{form.toAccountNumber}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Beneficiary</span><span className="text-sm font-medium">{form.beneficiaryName}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-mono font-bold text-primary">{formatMoney(form.amount, 'NGN')}</span></div>
          {form.narration && <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Narration</span><span className="text-sm">{form.narration}</span></div>}
        </div>

        {form.amount > ((limits as Record<string, number>)?.otpThreshold ?? 50000) && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <Shield className="w-4 h-4 flex-shrink-0" /> OTP verification required for amounts above {formatMoney((limits as Record<string, number>)?.otpThreshold ?? 50000, 'NGN')}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('form')} className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted">
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Edit
          </button>
          <button onClick={handleProceedToOtp} disabled={sendOtpMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {sendOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <ArrowRight className="w-4 h-4 inline mr-1" />}
            Confirm & Send
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──
  const canProceed = form.fromAccountId > 0 && form.toAccountNumber.length >= 10 && form.beneficiaryName && form.amount > 0;
  const insufficientBalance = selectedAccount && form.amount > selectedAccount.availableBalance;
  const exceedsLimit = limits && form.amount > ((limits as Record<string, number>).perTransactionLimit ?? Infinity);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Transfer Money</h1>

      {/* From Account */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">From Account</label>
        <select
          value={form.fromAccountId}
          onChange={(e) => {
            const acc = accounts.find((a) => a.id === Number(e.target.value));
            if (acc) setForm((prev) => ({ ...prev, fromAccountId: acc.id, fromAccountNumber: acc.accountNumber }));
          }}
          className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.accountType} - {acc.accountNumber} ({formatMoney(acc.availableBalance, acc.currency)})
            </option>
          ))}
        </select>
        {selectedAccount && (
          <p className="text-xs text-muted-foreground mt-1">Available: <span className="font-mono font-medium">{formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}</span></p>
        )}
      </div>

      {/* Beneficiary Quick Select */}
      {beneficiaries.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Saved Beneficiaries</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {beneficiaries.slice(0, 5).map((b) => (
              <button key={b.id} onClick={() => selectBeneficiary(b)}
                className={cn('flex-shrink-0 px-3 py-2 border rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors',
                  form.toAccountNumber === b.accountNumber ? 'border-primary bg-primary/5' : 'border-border')}>
                <User className="w-3 h-3 inline mr-1" /> {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* To Account */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Recipient Account Number</label>
        <div className="flex gap-2">
          <input value={form.toAccountNumber} onChange={(e) => update('toAccountNumber', e.target.value.replace(/\D/g, ''))}
            className="flex-1 px-3 py-2.5 border rounded-lg text-sm font-mono" placeholder="0012345678" maxLength={10} />
          <button onClick={handleNameEnquiry} disabled={form.toAccountNumber.length < 10 || nameEnquiryLoading}
            className="px-3 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
            {nameEnquiryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Beneficiary Name */}
      {form.beneficiaryName && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">{form.beneficiaryName}</span>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
        <MoneyInput value={form.amount} onChange={(v) => update('amount', v)} currency="NGN" />
        {insufficientBalance && <p className="text-xs text-red-600 mt-1">Insufficient balance</p>}
        {exceedsLimit && <p className="text-xs text-red-600 mt-1">Exceeds per-transaction limit of {formatMoney((limits as Record<string, number>).perTransactionLimit, 'NGN')}</p>}
      </div>

      {/* Narration */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Narration (optional)</label>
        <input value={form.narration} onChange={(e) => update('narration', e.target.value)}
          className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="Payment for..." maxLength={100} />
      </div>

      {/* Transfer Limit Indicator */}
      {limits && (
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Daily limit used</span>
            <span className="font-mono">{formatMoney((limits as Record<string, number>).usedToday ?? 0, 'NGN')} / {formatMoney((limits as Record<string, number>).dailyLimit ?? 0, 'NGN')}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (((limits as Record<string, number>).usedToday ?? 0) / ((limits as Record<string, number>).dailyLimit ?? 1)) * 100)}%` }} />
          </div>
        </div>
      )}

      <button onClick={() => setStep('review')} disabled={!canProceed || !!insufficientBalance || !!exceedsLimit}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        <ArrowRight className="w-4 h-4" /> Continue to Review
      </button>
    </div>
  );
}
