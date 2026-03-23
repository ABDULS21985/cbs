import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, Plus, X, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine,
  History, ChevronDown, ChevronUp, Globe,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatMoney, formatDateTime, formatRelative } from '@/lib/formatters';
import {
  useWallets, useAddWallet, useCreditWallet, useDebitWallet,
  useConvertWallet, useWalletTransactions,
} from '../hooks/useAccountsExt';
import { walletsApi } from '../api/walletApi';
import type { CurrencyWallet, WalletTransaction } from '../types/wallet';

// ── Currency metadata ────────────────────────────────────────────────────────

const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  NGN: { flag: '🇳🇬', name: 'Nigerian Naira' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  XOF: { flag: '🇸🇳', name: 'West African CFA' },
  ZAR: { flag: '🇿🇦', name: 'South African Rand' },
  GHS: { flag: '🇬🇭', name: 'Ghanaian Cedi' },
  KES: { flag: '🇰🇪', name: 'Kenyan Shilling' },
};

const AVAILABLE_CURRENCIES = Object.keys(CURRENCY_META);

// ── FX rate hook (real backend) ──────────────────────────────────────────────

function useFxRates(source?: string, target?: string) {
  return useQuery({
    queryKey: ['fx-rates', source, target],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source) params.set('sourceCurrency', source);
      if (target) params.set('targetCurrency', target);
      const apiModule = await import('@/lib/api');
      const { data } = await apiModule.default.get<{ data: Array<{ sourceCurrency: string; targetCurrency: string; buyRate: number; sellRate: number; midRate: number; }> }>(
        `/api/v1/fx/rate?${params.toString()}`
      );
      return data.data as Array<{
        sourceCurrency: string; targetCurrency: string;
        buyRate: number; sellRate: number; midRate: number;
      }>;
    },
    staleTime: 60_000,
    retry: 1,
    enabled: !!source && !!target,
  });
}

// ── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, icon, children }: {
  open: boolean; onClose: () => void; title: string;
  icon: React.ReactNode; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">{icon}</div>
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Create Wallet Modal ──────────────────────────────────────────────────────

function CreateWalletModal({ accountId, existingCurrencies, onClose }: {
  accountId: number; existingCurrencies: string[]; onClose: () => void;
}) {
  const [currency, setCurrency] = useState('');
  const addWallet = useAddWallet();
  const available = AVAILABLE_CURRENCIES.filter(c => !existingCurrencies.includes(c));

  const handleCreate = () => {
    if (!currency) return;
    addWallet.mutate({ accountId, data: { currencyCode: currency } }, { onSuccess: onClose });
  };

  return (
    <Modal open onClose={onClose} title="New Currency Wallet" icon={<Plus className="w-4 h-4 text-primary" />}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Currency <span className="text-red-500">*</span></label>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">All supported currencies are already active.</p>
          ) : (
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select currency...</option>
              {available.map(c => (
                <option key={c} value={c}>
                  {CURRENCY_META[c]?.flag} {c} — {CURRENCY_META[c]?.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!currency || addWallet.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {addWallet.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Wallet
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Fund / Withdraw Modal ────────────────────────────────────────────────────

function FundWithdrawModal({ accountId, wallet, mode, onClose }: {
  accountId: number; wallet: CurrencyWallet; mode: 'fund' | 'withdraw'; onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const creditMut = useCreditWallet();
  const debitMut = useDebitWallet();
  const mutation = mode === 'fund' ? creditMut : debitMut;

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    const payload = { walletId: wallet.id, amount: num, narration: narration || undefined };
    if (mode === 'fund') {
      creditMut.mutate({ accountId, data: payload }, { onSuccess: onClose });
    } else {
      debitMut.mutate({ accountId, data: payload }, { onSuccess: onClose });
    }
  };

  const isFund = mode === 'fund';
  return (
    <Modal
      open
      onClose={onClose}
      title={isFund ? `Fund ${wallet.currencyCode} Wallet` : `Withdraw from ${wallet.currencyCode} Wallet`}
      icon={isFund ? <ArrowDownToLine className="w-4 h-4 text-primary" /> : <ArrowUpFromLine className="w-4 h-4 text-primary" />}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Available Balance</div>
          <div className="text-lg font-semibold">{formatMoney(wallet.availableBalance, wallet.currencyCode)}</div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount <span className="text-red-500">*</span></label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={mode === 'withdraw' ? wallet.availableBalance : undefined}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Narration</label>
          <input
            type="text"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || mutation.isPending}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60',
              isFund
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-orange-600 text-white hover:bg-orange-700',
            )}
          >
            {mutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isFund ? (
              <ArrowDownToLine className="w-4 h-4" />
            ) : (
              <ArrowUpFromLine className="w-4 h-4" />
            )}
            {isFund ? 'Fund Wallet' : 'Withdraw'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Convert (FX) Modal ───────────────────────────────────────────────────────

function ConvertModal({ accountId, wallets, sourceWallet, onClose }: {
  accountId: number; wallets: CurrencyWallet[]; sourceWallet: CurrencyWallet; onClose: () => void;
}) {
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('');
  const convertMut = useConvertWallet();

  const targetWallet = wallets.find(w => w.id === Number(targetId));
  const { data: rates, isError: fxError } = useFxRates(
    sourceWallet.currencyCode,
    targetWallet?.currencyCode,
  );
  const liveRate = rates?.[0]?.sellRate ?? null;
  const parsedAmount = parseFloat(amount) || 0;
  const convertedAmount = liveRate && parsedAmount > 0 ? parsedAmount * liveRate : 0;

  const handleConvert = () => {
    if (!targetWallet || !liveRate || parsedAmount <= 0) return;
    convertMut.mutate({
      accountId,
      data: {
        sourceWalletId: sourceWallet.id,
        targetWalletId: targetWallet.id,
        amount: parsedAmount,
        rate: liveRate,
      },
    }, { onSuccess: onClose });
  };

  const otherWallets = wallets.filter(w => w.id !== sourceWallet.id && w.status === 'ACTIVE');

  return (
    <Modal open onClose={onClose} title="FX Conversion" icon={<ArrowRightLeft className="w-4 h-4 text-primary" />}>
      <div className="space-y-4">
        {/* Source */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">From</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">{CURRENCY_META[sourceWallet.currencyCode]?.flag}</span>
            <div>
              <div className="font-semibold">{sourceWallet.currencyCode}</div>
              <div className="text-xs text-muted-foreground">
                Available: {formatMoney(sourceWallet.availableBalance, sourceWallet.currencyCode)}
              </div>
            </div>
          </div>
        </div>

        {/* Target currency */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">To Currency <span className="text-red-500">*</span></label>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select target wallet...</option>
            {otherWallets.map(w => (
              <option key={w.id} value={w.id}>
                {CURRENCY_META[w.currencyCode]?.flag} {w.currencyCode} — Bal: {formatMoney(w.availableBalance, w.currencyCode)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount ({sourceWallet.currencyCode}) <span className="text-red-500">*</span></label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={sourceWallet.availableBalance}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Rate preview */}
        {targetWallet && fxError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-3">
            <p className="text-sm text-red-700 dark:text-red-400">
              Unable to fetch exchange rate. Please try again later.
            </p>
          </div>
        )}
        {targetWallet && !fxError && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-mono font-medium">
                {liveRate ? `1 ${sourceWallet.currencyCode} = ${liveRate.toFixed(4)} ${targetWallet.currencyCode}` : 'Loading...'}
              </span>
            </div>
            {parsedAmount > 0 && liveRate && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You Send</span>
                  <span className="font-mono text-red-600">
                    -{formatMoney(parsedAmount, sourceWallet.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You Receive</span>
                  <span className="font-mono text-green-600">
                    +{formatMoney(convertedAmount, targetWallet.currencyCode)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={!targetWallet || !liveRate || parsedAmount <= 0 || convertMut.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {convertMut.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            Convert
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Transaction History Panel ────────────────────────────────────────────────

function TransactionHistory({ walletId, currencyCode }: { walletId: number; currencyCode: string }) {
  const { data: transactions = [], isLoading } = useWalletTransactions(walletId);

  if (isLoading) return <div className="h-24 rounded-lg bg-muted animate-pulse" />;
  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">No transactions yet.</p>;
  }

  return (
    <div className="divide-y max-h-64 overflow-y-auto">
      {transactions.map((txn: WalletTransaction) => (
        <div key={txn.id} className="flex items-center justify-between py-2.5 px-1">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              txn.type === 'CREDIT' || txn.type === 'FX_BUY'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            )}>
              {txn.type === 'CREDIT' || txn.type === 'FX_BUY' ? '+' : '-'}
            </div>
            <div>
              <div className="text-sm font-medium">{txn.narration}</div>
              <div className="text-xs text-muted-foreground">{txn.reference} &middot; {formatRelative(txn.createdAt)}</div>
            </div>
          </div>
          <div className={cn(
            'text-sm font-mono font-medium',
            txn.type === 'CREDIT' || txn.type === 'FX_BUY' ? 'text-green-600' : 'text-red-600',
          )}>
            {txn.type === 'CREDIT' || txn.type === 'FX_BUY' ? '+' : '-'}
            {formatMoney(txn.amount, currencyCode)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Wallet Card ──────────────────────────────────────────────────────────────

function WalletCard({ wallet, accountId, wallets, onFund, onWithdraw, onConvert }: {
  wallet: CurrencyWallet; accountId: number; wallets: CurrencyWallet[];
  onFund: () => void; onWithdraw: () => void; onConvert: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const meta = CURRENCY_META[wallet.currencyCode];

  return (
    <div className="surface-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta?.flag ?? '🌐'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{wallet.currencyCode}</h3>
                {wallet.isPrimary && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                    PRIMARY
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{meta?.name ?? wallet.currencyCode}</p>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            wallet.status === 'ACTIVE'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          )}>
            {wallet.status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Balances */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Book Balance</div>
            <div className="text-lg font-semibold font-mono">{formatMoney(wallet.bookBalance, wallet.currencyCode)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-lg font-semibold font-mono text-green-600">{formatMoney(wallet.availableBalance, wallet.currencyCode)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Lien</div>
            <div className="text-lg font-semibold font-mono">{formatMoney(wallet.lienAmount, wallet.currencyCode)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onFund}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" /> Fund
          </button>
          <button
            onClick={onWithdraw}
            disabled={wallet.availableBalance <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
          </button>
          {wallets.filter(w => w.id !== wallet.id && w.status === 'ACTIVE').length > 0 && (
            <button
              onClick={onConvert}
              disabled={wallet.availableBalance <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Convert
            </button>
          )}
        </div>

        {/* Transaction history toggle */}
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            Transactions
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="mt-3">
              <TransactionHistory walletId={wallet.id} currencyCode={wallet.currencyCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function WalletPage() {
  useEffect(() => { document.title = 'Multi-Currency Wallets | CBS'; }, []);
  const [searchParams] = useSearchParams();
  const accountId = Number(searchParams.get('accountId') || 0);

  const { data: wallets = [], isLoading } = useWallets(accountId);

  const [showCreate, setShowCreate] = useState(false);
  const [fundTarget, setFundTarget] = useState<CurrencyWallet | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<CurrencyWallet | null>(null);
  const [convertSource, setConvertSource] = useState<CurrencyWallet | null>(null);

  // Summary
  const totalValueNGN = useMemo(() => {
    // In a full implementation this would use real FX rates;
    // for now, NGN wallets contribute directly, others show their own balance
    return wallets.reduce((sum, w) => {
      if (w.currencyCode === 'NGN') return sum + w.bookBalance;
      return sum + w.bookBalance; // backend should provide converted value
    }, 0);
  }, [wallets]);

  const largestPosition = useMemo(() => {
    if (wallets.length === 0) return null;
    return wallets.reduce((max, w) => w.bookBalance > max.bookBalance ? w : max, wallets[0]);
  }, [wallets]);

  if (!accountId) {
    return (
      <div>
        <PageHeader title="Multi-Currency Wallets" subtitle="Manage currency wallets for an account" />
        <div className="page-container">
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No account selected.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Navigate here from an account detail page to manage its currency wallets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Multi-Currency Wallets"
        subtitle={`Account #${accountId}`}
        backTo={`/accounts/${accountId}`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Wallet
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Value</div>
            <div className="stat-value text-sm">{formatMoney(totalValueNGN, 'NGN')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Currencies</div>
            <div className="stat-value">{wallets.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Largest Position</div>
            <div className="stat-value text-sm">
              {largestPosition
                ? `${largestPosition.currencyCode} ${formatMoney(largestPosition.bookBalance, largestPosition.currencyCode)}`
                : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value text-green-600">{wallets.filter(w => w.status === 'ACTIVE').length} Active</div>
          </div>
        </div>

        {/* Wallet cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No currency wallets yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a wallet in any supported currency to get started.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {wallets.map(wallet => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                accountId={accountId}
                wallets={wallets}
                onFund={() => setFundTarget(wallet)}
                onWithdraw={() => setWithdrawTarget(wallet)}
                onConvert={() => setConvertSource(wallet)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateWalletModal
          accountId={accountId}
          existingCurrencies={wallets.map(w => w.currencyCode)}
          onClose={() => setShowCreate(false)}
        />
      )}
      {fundTarget && (
        <FundWithdrawModal
          accountId={accountId}
          wallet={fundTarget}
          mode="fund"
          onClose={() => setFundTarget(null)}
        />
      )}
      {withdrawTarget && (
        <FundWithdrawModal
          accountId={accountId}
          wallet={withdrawTarget}
          mode="withdraw"
          onClose={() => setWithdrawTarget(null)}
        />
      )}
      {convertSource && (
        <ConvertModal
          accountId={accountId}
          wallets={wallets}
          sourceWallet={convertSource}
          onClose={() => setConvertSource(null)}
        />
      )}
    </div>
  );
}
