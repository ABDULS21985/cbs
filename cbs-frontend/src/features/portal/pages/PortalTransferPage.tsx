import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  Loader2,
  Search,
  Send,
  Shield,
  User,
} from 'lucide-react';

import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { PortalPageHero } from '../components/PortalPageHero';
import {
  portalApi,
  type PortalBeneficiary,
  type TransferLimits,
} from '../api/portalApi';

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

function OtpPanel({
  sessionId,
  onVerified,
  onBack,
}: {
  sessionId: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setCountdown((current) => Math.max(current - 1, 0)), 1000);

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
    if (!/^\d*$/.test(value)) {
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = value.slice(-1);
    setDigits(nextDigits);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (nextDigits.every((digit) => digit) && nextDigits.join('').length === 6) {
      setTimeout(() => verifyMutation.mutate(), 100);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Enter OTP</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A 6-digit code has been sent to your registered phone number.
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(event) => handleDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={cn(
              'h-14 w-12 rounded-2xl border-2 text-center text-xl font-semibold transition-colors focus:outline-none',
              error ? 'border-red-400' : digit ? 'border-primary' : 'border-border',
            )}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}

      <p className="text-center text-sm text-muted-foreground">
        {countdown > 0
          ? `Code expires in ${minutes}:${seconds.toString().padStart(2, '0')}`
          : 'OTP expired'}
      </p>

      <div className="flex gap-3">
        <button onClick={onBack} className="portal-action-button flex-1 justify-center">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => verifyMutation.mutate()}
          disabled={digits.join('').length < 6 || verifyMutation.isPending || countdown <= 0}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Verify
        </button>
      </div>
    </div>
  );
}

export function PortalTransferPage() {
  useEffect(() => {
    document.title = 'Transfer Money | BellBank';
  }, []);

  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<TransferForm>({
    fromAccountId: 0,
    fromAccountNumber: '',
    toAccountNumber: '',
    beneficiaryName: '',
    bankCode: '000',
    amount: 0,
    narration: '',
  });
  const [otpSessionId, setOtpSessionId] = useState('');
  const [transferResult, setTransferResult] = useState<Record<string, unknown> | null>(null);
  const [nameEnquiryLoading, setNameEnquiryLoading] = useState(false);
  const [idempotencyKey] = useState(() => `PTR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const { data: accounts = [] } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ['portal', 'beneficiaries'],
    queryFn: () => portalApi.getBeneficiaries(),
  });

  const { data: limits } = useQuery<TransferLimits>({
    queryKey: ['portal', 'transfer-limits'],
    queryFn: () => portalApi.getTransferLimits(),
  });

  const selectedAccount = accounts.find((account) => account.id === form.fromAccountId);

  const update = useCallback((field: keyof TransferForm, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const handleNameEnquiry = async () => {
    if (form.toAccountNumber.length < 10) {
      return;
    }

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
    } catch {
      toast.error('Name enquiry failed');
    } finally {
      setNameEnquiryLoading(false);
    }
  };

  const selectBeneficiary = (beneficiary: PortalBeneficiary) => {
    setForm((current) => ({
      ...current,
      toAccountNumber: beneficiary.accountNumber,
      beneficiaryName: beneficiary.name,
      bankCode: beneficiary.bankCode || '000',
    }));
  };

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

  const transferMutation = useMutation({
    mutationFn: () => {
      const creditAccount = accounts.find((account) => account.accountNumber === form.toAccountNumber);

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
    const otpThreshold = limits?.otpThreshold ?? 50_000;

    if (form.amount > otpThreshold) {
      sendOtpMutation.mutate();
      return;
    }

    setStep('processing');
    transferMutation.mutate();
  };

  const handleOtpVerified = () => {
    setStep('processing');
    transferMutation.mutate();
  };

  const handleNewTransfer = () => {
    setStep('form');
    setForm({
      fromAccountId: accounts[0]?.id ?? 0,
      fromAccountNumber: accounts[0]?.accountNumber ?? '',
      toAccountNumber: '',
      beneficiaryName: '',
      bankCode: '000',
      amount: 0,
      narration: '',
    });
    setTransferResult(null);
  };

  useEffect(() => {
    if (accounts.length > 0 && !form.fromAccountId) {
      setForm((current) => ({
        ...current,
        fromAccountId: accounts[0].id,
        fromAccountNumber: accounts[0].accountNumber,
      }));
    }
  }, [accounts, form.fromAccountId]);

  const heroMetrics = [
    {
      label: 'Available balance',
      value: selectedAccount ? formatMoney(selectedAccount.availableBalance, selectedAccount.currency) : 'Choose account',
    },
    {
      label: 'Per transfer limit',
      value: limits ? formatMoney(limits.perTransactionLimit, 'NGN') : 'Loading...',
    },
    {
      label: 'OTP threshold',
      value: limits ? formatMoney(limits.otpThreshold, 'NGN') : 'Loading...',
    },
  ];

  const renderShell = (description: string, content: ReactNode) => (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={Send}
        eyebrow="Portal Transfers"
        title="Transfer Money"
        description={description}
        chips={[
          selectedAccount ? `From ${selectedAccount.accountNumber}` : 'Choose debit account',
          form.toAccountNumber ? `To ${form.toAccountNumber}` : 'Validate recipient',
          step === 'success'
            ? 'Receipt ready'
            : step === 'otp'
              ? 'Security verification'
              : step === 'review'
                ? 'Review in progress'
                : 'Internal transfer',
        ]}
        metrics={heroMetrics}
      />
      {content}
    </div>
  );

  if (step === 'success' && transferResult) {
    return renderShell(
      'Funds have been posted successfully. Review the transfer reference or print the receipt from here.',
      <section className="portal-panel p-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-emerald-700">Transfer Successful</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(form.amount, 'NGN')} sent to {form.beneficiaryName}.
            </p>
          </div>

          <div className="portal-panel portal-panel-muted divide-y text-sm">
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs text-foreground">{String(transferResult.reference ?? '')}</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">From</span>
              <span className="font-mono text-foreground">{form.fromAccountNumber}</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">To</span>
              <span className="font-mono text-foreground">{form.toAccountNumber}</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-foreground">{formatMoney(form.amount, 'NGN')}</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-emerald-600">{String(transferResult.status)}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleNewTransfer} className="portal-action-button">
              <Send className="h-4 w-4" />
              New Transfer
            </button>
            <button onClick={() => window.print()} className="portal-action-button">
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
          </div>
        </div>
      </section>,
    );
  }

  if (step === 'failure') {
    return renderShell(
      'The transfer could not be completed. Review the details and try the payment flow again.',
      <section className="portal-panel p-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-10 w-10 text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-rose-700">Transfer Failed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The transfer could not be completed. Please review the details and retry.
            </p>
          </div>
          <button onClick={() => setStep('form')} className="portal-action-button">
            Try Again
          </button>
        </div>
      </section>,
    );
  }

  if (step === 'processing') {
    return renderShell(
      'Your transfer is being posted now. Stay on this screen until the status updates.',
      <section className="portal-panel p-10">
        <div className="mx-auto max-w-md text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Processing Transfer</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we complete your transaction.
          </p>
        </div>
      </section>,
    );
  }

  if (step === 'otp') {
    return renderShell(
      'This transfer is above the configured threshold and needs OTP confirmation before it can be released.',
      <section className="portal-panel p-6">
        <OtpPanel sessionId={otpSessionId} onVerified={handleOtpVerified} onBack={() => setStep('review')} />
      </section>,
    );
  }

  if (step === 'review') {
    return renderShell(
      'Confirm the beneficiary, amount, and narration before the transfer instruction is sent.',
      <section className="portal-panel p-6 space-y-6">
        <div className="portal-panel portal-panel-muted divide-y text-sm">
          <div className="flex justify-between px-5 py-3">
            <span className="text-muted-foreground">From</span>
            <span className="font-mono text-foreground">
              {selectedAccount?.accountName} ({form.fromAccountNumber})
            </span>
          </div>
          <div className="flex justify-between px-5 py-3">
            <span className="text-muted-foreground">To</span>
            <span className="font-mono text-foreground">{form.toAccountNumber}</span>
          </div>
          <div className="flex justify-between px-5 py-3">
            <span className="text-muted-foreground">Beneficiary</span>
            <span className="font-medium text-foreground">{form.beneficiaryName}</span>
          </div>
          <div className="flex justify-between px-5 py-3">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-primary">{formatMoney(form.amount, 'NGN')}</span>
          </div>
          {form.narration ? (
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Narration</span>
              <span className="text-foreground">{form.narration}</span>
            </div>
          ) : null}
        </div>

        {form.amount > (limits?.otpThreshold ?? 50_000) ? (
          <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/10 dark:text-amber-300">
            OTP verification is required for amounts above {formatMoney(limits?.otpThreshold ?? 50_000, 'NGN')}.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button onClick={() => setStep('form')} className="portal-action-button">
            <ArrowLeft className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleProceedToOtp}
            disabled={sendOtpMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Confirm and Send
          </button>
        </div>
      </section>,
    );
  }

  const canProceed =
    form.fromAccountId > 0 &&
    form.toAccountNumber.length >= 10 &&
    !!form.beneficiaryName &&
    form.amount > 0;

  const insufficientBalance = !!selectedAccount && form.amount > selectedAccount.availableBalance;
  const exceedsLimit = !!limits && form.amount > limits.perTransactionLimit;

  return renderShell(
    'Move funds between internal accounts with live name enquiry, limit visibility, and beneficiary shortcuts.',
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.85fr)]">
      <section className="portal-panel p-6 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">From Account</span>
          <select
            value={form.fromAccountId}
            onChange={(event) => {
              const account = accounts.find((item) => item.id === Number(event.target.value));
              if (account) {
                setForm((current) => ({
                  ...current,
                  fromAccountId: account.id,
                  fromAccountNumber: account.accountNumber,
                }));
              }
            }}
            className="portal-inline-input"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountType} - {account.accountNumber} ({formatMoney(account.availableBalance, account.currency)})
              </option>
            ))}
          </select>
          {selectedAccount ? (
            <p className="text-xs text-muted-foreground">
              Available: <span className="font-medium text-foreground">{formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}</span>
            </p>
          ) : null}
        </label>

        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground">Recipient Account Number</span>
          <div className="flex gap-2">
            <input
              value={form.toAccountNumber}
              onChange={(event) => update('toAccountNumber', event.target.value.replace(/\D/g, ''))}
              className="portal-inline-input font-mono"
              placeholder="0012345678"
              maxLength={10}
            />
            <button
              onClick={handleNameEnquiry}
              disabled={form.toAccountNumber.length < 10 || nameEnquiryLoading}
              className="portal-action-button disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Validate recipient account"
            >
              {nameEnquiryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {form.beneficiaryName ? (
          <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/10 dark:text-emerald-300">
            Beneficiary confirmed: <span className="font-semibold">{form.beneficiaryName}</span>
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Amount</span>
          <MoneyInput value={form.amount} onChange={(value) => update('amount', value)} currency="NGN" />
          {insufficientBalance ? <p className="text-xs text-red-600">Insufficient balance</p> : null}
          {exceedsLimit ? (
            <p className="text-xs text-red-600">
              Exceeds per-transaction limit of {formatMoney(limits?.perTransactionLimit ?? 0, 'NGN')}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Narration (optional)</span>
          <input
            value={form.narration}
            onChange={(event) => update('narration', event.target.value)}
            className="portal-inline-input"
            placeholder="Payment for..."
            maxLength={100}
          />
        </label>

        <button
          onClick={() => setStep('review')}
          disabled={!canProceed || insufficientBalance || exceedsLimit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" />
          Continue to Review
        </button>
      </section>

      <aside className="space-y-4">
        {beneficiaries.length > 0 ? (
          <section className="portal-panel p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Saved Beneficiaries</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reuse trusted beneficiaries to speed up the transfer form.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {beneficiaries.slice(0, 6).map((beneficiary) => (
                <button
                  key={beneficiary.id}
                  onClick={() => selectBeneficiary(beneficiary)}
                  className={cn(
                    'portal-filter-chip',
                    form.toAccountNumber === beneficiary.accountNumber && 'border-primary bg-primary/10 text-primary',
                  )}
                  data-active={form.toAccountNumber === beneficiary.accountNumber ? 'true' : 'false'}
                >
                  <User className="h-3.5 w-3.5" />
                  {beneficiary.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {limits ? (
          <section className="portal-panel p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Transfer Limits</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily and per-transaction controls from your live portal profile.
              </p>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Daily used</span>
                <span className="font-medium text-foreground">
                  {formatMoney(limits.usedToday, 'NGN')} / {formatMoney(limits.dailyLimit, 'NGN')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (limits.usedToday / Math.max(limits.dailyLimit, 1)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Remaining today</span>
                <span className="font-medium text-foreground">{formatMoney(limits.remainingDaily, 'NGN')}</span>
              </div>
            </div>
          </section>
        ) : null}

        {selectedAccount ? (
          <section className="portal-panel portal-panel-muted p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Funding Account</p>
            <p className="text-lg font-semibold text-foreground">{selectedAccount.accountName}</p>
            <p className="text-sm text-muted-foreground font-mono">{selectedAccount.accountNumber}</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}
            </p>
          </section>
        ) : null}
      </aside>
    </div>,
  );
}
