import { useDeferredValue, useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Hash,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { accountDetailApi, type Account } from '../api/accountDetailApi';

type PostingType = 'DEBIT' | 'CREDIT' | 'TRANSFER';

interface PostingFormState {
  type: PostingType;
  accountNumber: string;
  contraAccount: string;
  amount: string;
  narration: string;
  channel: string;
  externalRef: string;
  contraGlCode: string;
  valueDate: string;
  instrumentNumber: string;
}

const CHANNELS = ['BRANCH', 'SYSTEM', 'API', 'MOBILE', 'INTERNET', 'ATM', 'POS', 'CHEQUE'];
const MIN_ACCOUNT_LENGTH = 10;

const POSTING_TYPE_META: Record<PostingType, {
  label: string;
  caption: string;
  description: string;
  icon: typeof ArrowDownLeft;
  selectedClassName: string;
  iconWrapClassName: string;
}> = {
  CREDIT: {
    label: 'Credit',
    caption: 'Inbound posting',
    description: 'Customer funding, adjustment, or recovery inflow.',
    icon: ArrowDownLeft,
    selectedClassName: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
    iconWrapClassName: 'bg-emerald-500/15 text-emerald-300',
  },
  DEBIT: {
    label: 'Debit',
    caption: 'Outbound posting',
    description: 'Manual charge, withdrawal, or book adjustment outflow.',
    icon: ArrowUpRight,
    selectedClassName: 'border-rose-400/60 bg-rose-500/10 text-rose-200',
    iconWrapClassName: 'bg-rose-500/15 text-rose-300',
  },
  TRANSFER: {
    label: 'Transfer',
    caption: 'Internal movement',
    description: 'Move funds between two real accounts in one flow.',
    icon: ArrowLeftRight,
    selectedClassName: 'border-sky-400/60 bg-sky-500/10 text-sky-200',
    iconWrapClassName: 'bg-sky-500/15 text-sky-300',
  },
};

function createInitialForm(accountNumber = '', type: PostingType = 'CREDIT'): PostingFormState {
  return {
    type,
    accountNumber,
    contraAccount: '',
    amount: '',
    narration: '',
    channel: 'BRANCH',
    externalRef: '',
    contraGlCode: '',
    valueDate: '',
    instrumentNumber: '',
  };
}

function normalizeAccountNumber(value: string): string {
  return value.replace(/\s+/g, '');
}

function isLookupReady(value: string): boolean {
  return normalizeAccountNumber(value).length >= MIN_ACCOUNT_LENGTH;
}

function parseAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function AccountPreviewCard({
  title,
  hint,
  accountNumber,
  account,
  isLoading,
  isError,
  emptyLabel,
  actionLabel,
}: {
  title: string;
  hint: string;
  accountNumber: string;
  account?: Account;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  actionLabel: string;
}) {
  const normalized = normalizeAccountNumber(accountNumber);

  return (
    <div className="gloss-panel rounded-[24px] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {actionLabel}
        </div>
      </div>

      {!normalized ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : isLoading ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 animate-pulse">
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 rounded-xl bg-white/10" />
            <div className="h-14 rounded-xl bg-white/10" />
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-4 text-sm text-red-200">
          No live account record was found for <span className="font-money">{normalized}</span>.
        </div>
      ) : account ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{account.accountTitle}</p>
              <p className="font-money text-xs text-muted-foreground">{account.accountNumber}</p>
            </div>
            <StatusBadge status={account.status} dot />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Available</p>
              <p className="mt-1 text-sm font-semibold">{formatMoney(account.availableBalance, account.currency)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ledger</p>
              <p className="mt-1 text-sm font-semibold">{formatMoney(account.ledgerBalance, account.currency)}</p>
            </div>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>{account.branchCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <Landmark className="h-3.5 w-3.5" />
              <span>{account.productName}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className={cn(
              'rounded-full px-2.5 py-1',
              account.allowDebit ? 'bg-emerald-500/12 text-emerald-200' : 'bg-red-500/12 text-red-200',
            )}>
              Debit {account.allowDebit ? 'enabled' : 'blocked'}
            </span>
            <span className={cn(
              'rounded-full px-2.5 py-1',
              account.allowCredit ? 'bg-sky-500/12 text-sky-200' : 'bg-red-500/12 text-red-200',
            )}>
              Credit {account.allowCredit ? 'enabled' : 'blocked'}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-muted-foreground">
          Enter a full account number to load live context.
        </div>
      )}
    </div>
  );
}

export function TransactionPostingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledAccount = normalizeAccountNumber(searchParams.get('account') ?? '');
  const [form, setForm] = useState<PostingFormState>(() => createInitialForm(prefilledAccount));
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Post Transaction | CBS';
  }, []);

  const amount = parseAmount(form.amount);
  const sourceLookup = useDeferredValue(normalizeAccountNumber(form.accountNumber));
  const contraLookup = useDeferredValue(normalizeAccountNumber(form.contraAccount));

  const sourceAccountQuery = useQuery({
    queryKey: ['accounts', 'posting', 'source', sourceLookup],
    queryFn: () => accountDetailApi.getAccount(sourceLookup),
    enabled: isLookupReady(sourceLookup),
    staleTime: 30_000,
    retry: false,
  });

  const contraAccountQuery = useQuery({
    queryKey: ['accounts', 'posting', 'contra', contraLookup],
    queryFn: () => accountDetailApi.getAccount(contraLookup),
    enabled: isLookupReady(contraLookup),
    staleTime: 30_000,
    retry: false,
  });

  const sourceAccount = sourceAccountQuery.data;
  const contraAccount = contraAccountQuery.data;

  const updateField = <K extends keyof PostingFormState>(key: K, value: PostingFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const debitMutation = useMutation({
    mutationFn: () => accountDetailApi.postDebit({
      accountNumber: normalizeAccountNumber(form.accountNumber),
      amount,
      narration: form.narration.trim(),
      channel: form.channel,
      externalRef: form.externalRef.trim() || undefined,
      contraAccountNumber: normalizeAccountNumber(form.contraAccount) || undefined,
      contraGlCode: form.contraGlCode.trim() || undefined,
      valueDate: form.valueDate || undefined,
      instrumentNumber: form.instrumentNumber.trim() || undefined,
    }),
    onSuccess: (result) => {
      setErrorMessage(null);
      setSuccess(result);
      toast.success('Debit posted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Debit failed';
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const creditMutation = useMutation({
    mutationFn: () => accountDetailApi.postCredit({
      accountNumber: normalizeAccountNumber(form.accountNumber),
      amount,
      narration: form.narration.trim(),
      channel: form.channel,
      externalRef: form.externalRef.trim() || undefined,
      contraAccountNumber: normalizeAccountNumber(form.contraAccount) || undefined,
      contraGlCode: form.contraGlCode.trim() || undefined,
      valueDate: form.valueDate || undefined,
      instrumentNumber: form.instrumentNumber.trim() || undefined,
    }),
    onSuccess: (result) => {
      setErrorMessage(null);
      setSuccess(result);
      toast.success('Credit posted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Credit failed';
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => accountDetailApi.postTransfer({
      fromAccountNumber: normalizeAccountNumber(form.accountNumber),
      toAccountNumber: normalizeAccountNumber(form.contraAccount),
      amount,
      narration: form.narration.trim(),
      channel: form.channel,
    }),
    onSuccess: (result) => {
      setErrorMessage(null);
      setSuccess(result);
      toast.success('Transfer posted successfully');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Transfer failed';
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const isPending = debitMutation.isPending || creditMutation.isPending || transferMutation.isPending;

  const blockingIssues: string[] = [];
  const advisoryIssues: string[] = [];

  if (!sourceLookup) {
    blockingIssues.push('Source account is required.');
  }
  if (amount <= 0) {
    blockingIssues.push('Enter an amount greater than zero.');
  }
  if (!form.narration.trim()) {
    blockingIssues.push('Narration is required.');
  }
  if (form.type === 'TRANSFER' && !contraLookup) {
    blockingIssues.push('Destination account is required for transfers.');
  }
  if (form.type === 'TRANSFER' && sourceLookup && contraLookup && sourceLookup === contraLookup) {
    blockingIssues.push('Source and destination accounts must be different.');
  }
  if (form.type !== 'TRANSFER' && form.contraAccount.trim() && form.contraGlCode.trim()) {
    blockingIssues.push('Use either Contra Account or Contra GL Code, not both.');
  }
  if (sourceLookup && isLookupReady(sourceLookup) && sourceAccountQuery.isError) {
    blockingIssues.push('Source account could not be resolved.');
  }
  if (form.type === 'TRANSFER' && contraLookup && isLookupReady(contraLookup) && contraAccountQuery.isError) {
    blockingIssues.push('Destination account could not be resolved.');
  }
  if (form.type === 'CREDIT' && sourceAccount && !sourceAccount.allowCredit) {
    blockingIssues.push('The selected account does not permit credits.');
  }
  if ((form.type === 'DEBIT' || form.type === 'TRANSFER') && sourceAccount && !sourceAccount.allowDebit) {
    blockingIssues.push('The selected source account does not permit debits.');
  }
  if (form.type === 'TRANSFER' && contraAccount && !contraAccount.allowCredit) {
    blockingIssues.push('The destination account does not permit credits.');
  }

  if (form.type !== 'TRANSFER' && !form.contraAccount.trim() && !form.contraGlCode.trim()) {
    advisoryIssues.push('No contra leg is specified. CBS will rely on configured product defaults if available.');
  }
  if ((form.type === 'DEBIT' || form.type === 'TRANSFER') && sourceAccount && amount > 0) {
    const debitCapacity = sourceAccount.availableBalance + sourceAccount.overdraftLimit;
    if (amount > debitCapacity) {
      advisoryIssues.push('Requested amount is above the displayed available funds and may be rejected by posting controls.');
    }
  }
  if (form.externalRef.trim() && form.externalRef.trim().length < 6) {
    advisoryIssues.push('External reference is short. Use a traceable upstream reference where available.');
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blockingIssues.length > 0 || isPending) {
      return;
    }

    if (form.type === 'DEBIT') {
      debitMutation.mutate();
      return;
    }
    if (form.type === 'CREDIT') {
      creditMutation.mutate();
      return;
    }
    transferMutation.mutate();
  };

  const resetForm = ({ keepAccount, keepType }: { keepAccount: boolean; keepType: boolean }) => {
    setSuccess(null);
    setErrorMessage(null);
    setForm(createInitialForm(keepAccount ? sourceLookup || prefilledAccount : '', keepType ? form.type : 'CREDIT'));
  };

  const handleSwapAccounts = () => {
    if (form.type !== 'TRANSFER') {
      return;
    }
    setForm((current) => ({
      ...current,
      accountNumber: current.contraAccount,
      contraAccount: current.accountNumber,
    }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const fieldClassName = 'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20';
  const textAreaClassName = 'min-h-[112px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20';

  if (success) {
    const transactionRef = typeof success.transactionRef === 'string' ? success.transactionRef : null;
    const status = typeof success.status === 'string' ? success.status : 'POSTED';
    const ctaAccount = sourceLookup || prefilledAccount;

    return (
      <>
        <PageHeader
          title="Transaction Posted"
          subtitle="The posting has been accepted by the core ledger flow."
          backTo="/accounts"
          icon={CheckCircle2}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-300"
        />
        <div className="page-container">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_340px]">
            <div className="gloss-panel rounded-[30px] p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Posting complete
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {POSTING_TYPE_META[form.type].label}
                </span>
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                {POSTING_TYPE_META[form.type].label} posted successfully.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                The entry has been submitted against the live account rails. Use the next actions below to continue operator work without reopening the flow.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Amount</p>
                  <p className="mt-2 text-xl font-semibold">{formatMoney(amount, sourceAccount?.currency ?? contraAccount?.currency ?? 'NGN')}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Account</p>
                  <p className="mt-2 font-money text-lg">{sourceLookup}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                  <p className="mt-2 text-lg font-semibold">{status}</p>
                </div>
              </div>

              {transactionRef && (
                <div className="mt-5 rounded-[24px] border border-primary/20 bg-primary/8 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Transaction reference</p>
                  <p className="mt-2 font-money text-base text-foreground">{transactionRef}</p>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => resetForm({ keepAccount: true, keepType: true })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Post another on this account
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => resetForm({ keepAccount: false, keepType: false })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-foreground transition hover:bg-white/10"
                >
                  Start clean
                  <RefreshCw className="h-4 w-4" />
                </button>
                {ctaAccount && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/${ctaAccount}`)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-foreground transition hover:bg-white/10"
                    >
                      Open account
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/payments/history?acc=${encodeURIComponent(ctaAccount)}`)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-foreground transition hover:bg-white/10"
                    >
                      View history
                    </button>
                  </>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="gloss-panel rounded-[28px] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Settlement route
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em]">Source</p>
                    <p className="mt-1 font-money text-foreground">{sourceLookup || 'Not provided'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em]">
                      {form.type === 'TRANSFER' ? 'Destination' : 'Contra'}
                    </p>
                    <p className="mt-1 font-money text-foreground">
                      {form.type === 'TRANSFER'
                        ? contraLookup || 'Not provided'
                        : contraLookup || form.contraGlCode.trim() || 'Defaults / product mapping'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Post Transaction"
        subtitle="Modern operator posting flow for debit, credit, and account-to-account transfer."
        backTo="/accounts"
        icon={CircleDollarSign}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        actions={sourceAccount ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/accounts/${sourceLookup}`)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-foreground transition hover:bg-white/10"
            >
              Open account
            </button>
            <button
              type="button"
              onClick={() => resetForm({ keepAccount: false, keepType: false })}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-foreground transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => resetForm({ keepAccount: false, keepType: false })}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-foreground transition hover:bg-white/10"
          >
            Reset
          </button>
        )}
      />

      <div className="page-container">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <form onSubmit={handleSubmit} className="gloss-panel rounded-[30px] p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Operator posting desk
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  Move value with live account context.
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  The flow now validates live account rails, exposes the full posting contract, and keeps the final impact visible before you commit.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Posting amount</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {amount > 0 ? formatMoney(amount, sourceAccount?.currency ?? contraAccount?.currency ?? 'NGN') : 'Enter amount'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{POSTING_TYPE_META[form.type].caption}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {(Object.keys(POSTING_TYPE_META) as PostingType[]).map((postingType) => {
                const meta = POSTING_TYPE_META[postingType];
                const Icon = meta.icon;
                return (
                  <button
                    key={postingType}
                    type="button"
                    onClick={() => updateField('type', postingType)}
                    className={cn(
                      'rounded-[24px] border p-4 text-left transition-all',
                      form.type === postingType
                        ? meta.selectedClassName
                        : 'border-white/10 bg-white/5 text-foreground hover:border-primary/30 hover:bg-white/8',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{meta.caption}</p>
                      </div>
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', meta.iconWrapClassName)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{meta.description}</p>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-red-500/25 bg-red-500/10 px-4 py-4 text-sm text-red-200">
                <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Posting failed</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {form.type === 'TRANSFER' ? 'From Account *' : 'Account Number *'}
                </label>
                <input
                  value={form.accountNumber}
                  onChange={(event) => updateField('accountNumber', event.target.value)}
                  placeholder="Account number"
                  className={cn(fieldClassName, 'font-money')}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {form.type === 'TRANSFER' ? 'To Account *' : 'Contra Account'}
                  </label>
                  {form.type === 'TRANSFER' && (
                    <button
                      type="button"
                      onClick={handleSwapAccounts}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-white/10"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Swap
                    </button>
                  )}
                </div>
                <input
                  value={form.contraAccount}
                  onChange={(event) => updateField('contraAccount', event.target.value)}
                  placeholder={form.type === 'TRANSFER' ? 'Destination account' : 'Contra account number (optional)'}
                  className={cn(fieldClassName, 'font-money')}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(event) => updateField('amount', event.target.value)}
                  placeholder="0.00"
                  className={cn(fieldClassName, 'font-money text-lg font-semibold')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Channel</label>
                <select
                  value={form.channel}
                  onChange={(event) => updateField('channel', event.target.value)}
                  className={fieldClassName}
                >
                  {CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Narration *</label>
              <textarea
                value={form.narration}
                onChange={(event) => updateField('narration', event.target.value)}
                placeholder="Transaction description"
                className={textAreaClassName}
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {form.type !== 'TRANSFER' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Contra GL Code</label>
                    <input
                      value={form.contraGlCode}
                      onChange={(event) => updateField('contraGlCode', event.target.value)}
                      placeholder="GL code (optional)"
                      className={cn(fieldClassName, 'font-money')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">External Ref</label>
                    <input
                      value={form.externalRef}
                      onChange={(event) => updateField('externalRef', event.target.value)}
                      placeholder="Optional"
                      className={cn(fieldClassName, 'font-money')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Value Date</label>
                    <input
                      type="date"
                      value={form.valueDate}
                      onChange={(event) => updateField('valueDate', event.target.value)}
                      className={fieldClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Instrument Number</label>
                    <input
                      value={form.instrumentNumber}
                      onChange={(event) => updateField('instrumentNumber', event.target.value)}
                      placeholder="Cheque / teller / advice ref"
                      className={cn(fieldClassName, 'font-money')}
                    />
                  </div>
                </>
              )}

              {form.type === 'TRANSFER' && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Settlement Rail</label>
                    <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground">
                      Immediate internal transfer
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2 xl:col-span-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operator guidance</label>
                    <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-muted-foreground">
                      Transfers post directly between the selected source and destination accounts using the chosen channel.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Live account checks update as you type.
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Narration, value date, instrument number, and contra routing are passed directly to the backend contract.
                </div>
              </div>
              <button
                type="submit"
                disabled={blockingIssues.length > 0 || isPending}
                className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Post {form.type}
              </button>
            </div>
          </form>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="gloss-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Live posting review
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
                  <p className="mt-1 text-base font-semibold">{POSTING_TYPE_META[form.type].label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{POSTING_TYPE_META[form.type].description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <CircleDollarSign className="h-3.5 w-3.5" />
                      Amount
                    </div>
                    <p className="mt-2 text-base font-semibold">
                      {amount > 0 ? formatMoney(amount, sourceAccount?.currency ?? contraAccount?.currency ?? 'NGN') : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      Channel
                    </div>
                    <p className="mt-2 text-base font-semibold">{form.channel}</p>
                  </div>
                </div>
                {form.type !== 'TRANSFER' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Value Date
                      </div>
                      <p className="mt-2 text-base font-semibold">{form.valueDate || 'Today / default'}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        Instrument
                      </div>
                      <p className="mt-2 truncate text-base font-semibold">{form.instrumentNumber || 'Not set'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <AccountPreviewCard
              title={form.type === 'TRANSFER' ? 'Source account' : 'Posting account'}
              hint="Resolved from the live account service."
              accountNumber={form.accountNumber}
              account={sourceAccount}
              isLoading={sourceAccountQuery.isLoading}
              isError={sourceAccountQuery.isError}
              emptyLabel="Start with the account to be debited or credited."
              actionLabel="Primary leg"
            />

            <AccountPreviewCard
              title={form.type === 'TRANSFER' ? 'Destination account' : 'Contra account'}
              hint={form.type === 'TRANSFER' ? 'The receiving account for this movement.' : 'Optional live preview when you use an account as the contra leg.'}
              accountNumber={form.contraAccount}
              account={contraAccount}
              isLoading={contraAccountQuery.isLoading}
              isError={contraAccountQuery.isError}
              emptyLabel={form.type === 'TRANSFER' ? 'Provide a destination account to complete the transfer path.' : 'You can leave this blank and route the posting through a GL code instead.'}
              actionLabel={form.type === 'TRANSFER' ? 'Receiving leg' : 'Balancing leg'}
            />

            <div className="gloss-panel rounded-[28px] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Validation & operator notes
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {blockingIssues.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Ready to post
                    </div>
                    <p className="mt-1 text-emerald-100/80">The required fields are present and the visible account controls do not currently block this instruction.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
                    <div className="flex items-center gap-2 font-medium">
                      <TriangleAlert className="h-4 w-4" />
                      Resolve before posting
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {blockingIssues.map((issue) => (
                        <li key={issue} className="text-red-100/90">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {advisoryIssues.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-100">
                    <div className="flex items-center gap-2 font-medium text-amber-200">
                      <TriangleAlert className="h-4 w-4" />
                      Advisory notes
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {advisoryIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
