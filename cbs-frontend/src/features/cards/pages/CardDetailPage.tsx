import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, DataTable, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime, formatRelative } from '@/lib/formatters';
import { useCard, useCardTransactions, useBlockCard, useActivateCard, useUpdateCardControls } from '../hooks/useCardData';
import { useCardTokens, useSuspendToken, useResumeToken, useDeactivateToken, useHotlistCard, useDisputeTransaction, useDisputesByStatus } from '../hooks/useCardsExt';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Lock, Unlock, KeyRound, RefreshCw, ShieldAlert, FileText,
  Copy, Check, X, Smartphone, CreditCard, Wifi, Globe, Clock,
  AlertTriangle, Ban, Eye,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { CardTransaction } from '../types/card';
import type { CardToken, CardDispute } from '../types/cardExt';

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded-lg', className)} />;
}

function CardPageSkeleton() {
  return (
    <div className="page-container space-y-6">
      {/* Card visual */}
      <div className="flex flex-col md:flex-row gap-6">
        <Skeleton className="w-80 h-48 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        </div>
      </div>
      {/* Quick actions */}
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-20 h-16 rounded-xl" />)}
      </div>
      {/* Tabs content */}
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ── Card Visual ──────────────────────────────────────────────────────────────

function CardVisual({ card }: { card: import('../types/card').Card }) {
  const [copied, setCopied] = useState(false);
  const last4 = card.cardNumberMasked.slice(-4);
  const isBlocked = card.status === 'BLOCKED' || card.status === 'SUSPENDED';

  const copyLast4 = () => {
    navigator.clipboard.writeText(last4);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const schemeColors: Record<string, string> = {
    VISA: 'from-[#1a1f71] via-[#2557a7] to-[#1a1f71]',
    MASTERCARD: 'from-[#cc0000] via-[#ff5f00] to-[#cc0000]',
    VERVE: 'from-[#005a30] via-[#008751] to-[#005a30]',
  };

  return (
    <div className="relative group" role="img" aria-label={`${card.scheme} ${card.cardType} card ending in ${last4}, status ${card.status}, expires ${card.expiryDate}, holder ${card.nameOnCard}`}>
      <div className={cn(
        'w-80 h-48 rounded-2xl bg-gradient-to-br text-white p-6 flex flex-col justify-between shadow-xl transition-transform group-hover:scale-[1.02] overflow-hidden',
        schemeColors[card.scheme] ?? 'from-[#0B1A56] via-[#1E40AF] to-[#15308A]',
      )}>
        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={card.status} size="sm" />
        </div>

        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold tracking-wider opacity-70">{card.scheme}</span>
          <span className="text-xs font-bold opacity-80">{card.cardType}</span>
        </div>

        <div className="font-mono text-lg tracking-[0.2em] flex items-center gap-2">
          <span>{card.cardNumberMasked}</span>
          <button onClick={copyLast4} className="opacity-60 hover:opacity-100 transition-opacity p-0.5" title="Copy last 4 digits">
            {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] opacity-60 uppercase">Card Holder</div>
            <div className="text-sm font-medium">{card.nameOnCard}</div>
          </div>
          <div>
            <div className="text-[10px] opacity-60 uppercase">Valid Thru</div>
            <div className="text-sm font-mono">{card.expiryDate}</div>
          </div>
        </div>

        {/* Blocked overlay */}
        {isBlocked && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-1 text-red-200" />
              <span className="text-sm font-bold text-red-100">{card.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick Actions Bar ────────────────────────────────────────────────────────

function QuickActions({ card }: { card: import('../types/card').Card }) {
  const navigate = useNavigate();
  const blockCard = useBlockCard();
  const activateCard = useActivateCard();
  const hotlistCard = useHotlistCard();
  const [showReplace, setShowReplace] = useState(false);
  const [showLostStolen, setShowLostStolen] = useState(false);

  const isActive = card.status === 'ACTIVE';
  const isBlocked = card.status === 'BLOCKED' || card.status === 'SUSPENDED';

  const handleToggleLock = () => {
    if (isActive) {
      blockCard.mutate({ id: card.id, reason: 'Customer requested temporary lock' }, {
        onSuccess: () => toast.success('Card locked'),
        onError: () => toast.error('Failed to lock card'),
      });
    } else if (isBlocked) {
      activateCard.mutate(card.id, {
        onSuccess: () => toast.success('Card unlocked'),
        onError: () => toast.error('Failed to unlock card'),
      });
    }
  };

  const handleHotlist = (reason: string) => {
    hotlistCard.mutate(card.id, {
      onSuccess: () => { toast.success('Card hotlisted — replacement will be issued'); setShowLostStolen(false); },
      onError: () => toast.error('Failed to hotlist card'),
    });
  };

  const actions = [
    {
      icon: isActive ? Lock : Unlock,
      label: isActive ? 'Lock Card' : 'Unlock',
      onClick: handleToggleLock,
      disabled: !isActive && !isBlocked,
      loading: blockCard.isPending || activateCard.isPending,
    },
    {
      icon: KeyRound,
      label: 'Set PIN',
      onClick: () => toast.info('PIN changes are available at your nearest branch'),
      disabled: false,
    },
    {
      icon: RefreshCw,
      label: 'Replace',
      onClick: () => setShowReplace(true),
      disabled: card.status === 'DESTROYED',
    },
    {
      icon: ShieldAlert,
      label: 'Lost/Stolen',
      onClick: () => setShowLostStolen(true),
      disabled: card.status === 'DESTROYED',
    },
    {
      icon: FileText,
      label: 'Statements',
      onClick: () => navigate(`/accounts/${card.accountId}`),
      disabled: false,
    },
  ];

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              aria-label={action.label}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[72px]"
            >
              {action.loading ? (
                <span className="w-5 h-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Icon className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-[11px] font-medium text-muted-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Replace Card Modal */}
      {showReplace && (
        <Modal title="Request Card Replacement" onClose={() => setShowReplace(false)}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select reason for replacement:</p>
            {['Damaged card', 'Worn out', 'Name change', 'Upgrade request'].map((reason) => (
              <button key={reason} onClick={() => { toast.success(`Replacement requested: ${reason}`); setShowReplace(false); }}
                className="w-full text-left px-4 py-3 rounded-lg border hover:bg-muted text-sm transition-colors">
                {reason}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Lost/Stolen Modal */}
      {showLostStolen && (
        <Modal title="Report Lost or Stolen Card" onClose={() => setShowLostStolen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This will immediately hotlist your card and block all transactions. A replacement card will be issued.</p>
            <div className="flex gap-2">
              {['Lost', 'Stolen', 'Fraud suspected'].map((reason) => (
                <button key={reason} onClick={() => handleHotlist(reason)}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Focus first focusable element on open
    const panel = panelRef.current;
    if (panel) {
      const focusable = panel.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
    // Trap Escape
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Controls Tab ─────────────────────────────────────────────────────────────

function ControlsTab({ card }: { card: import('../types/card').Card }) {
  const updateControls = useUpdateCardControls();
  const [controls, setControls] = useState(card.controls ?? {
    posEnabled: false, atmEnabled: false, onlineEnabled: false,
    internationalEnabled: false, contactlessEnabled: false, recurringEnabled: false,
  });

  const toggleControl = (key: keyof typeof controls) => {
    const newVal = !controls[key];
    setControls((prev) => ({ ...prev, [key]: newVal }));
    updateControls.mutate(
      { id: card.id, controls: { [key]: newVal } },
      {
        onSuccess: () => toast.success(`${key.replace('Enabled', '')} ${newVal ? 'enabled' : 'disabled'}`),
        onError: () => {
          setControls((prev) => ({ ...prev, [key]: !newVal }));
          toast.error('Failed to update control');
        },
      },
    );
  };

  const channelControls = [
    { key: 'posEnabled' as const, label: 'POS Transactions', desc: 'Allow payments at point-of-sale terminals', icon: CreditCard },
    { key: 'atmEnabled' as const, label: 'ATM Withdrawals', desc: 'Allow cash withdrawals at ATM machines', icon: Ban },
    { key: 'onlineEnabled' as const, label: 'Online / eCommerce', desc: 'Allow online purchases and payments', icon: Globe },
    { key: 'contactlessEnabled' as const, label: 'Contactless', desc: 'Allow tap-to-pay NFC transactions', icon: Wifi },
  ];

  const txnControls = [
    { key: 'internationalEnabled' as const, label: 'International', desc: 'Allow transactions outside your country', icon: Globe },
    { key: 'recurringEnabled' as const, label: 'Recurring Payments', desc: 'Allow subscriptions and recurring charges', icon: Clock },
  ];

  const renderToggleGroup = (title: string, items: typeof channelControls) => (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h4>
      {items.map(({ key, label, desc, icon: Icon }) => (
        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">{label}</span>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={controls[key]}
            aria-label={`${label} ${controls[key] ? 'enabled' : 'disabled'}`}
            onClick={() => toggleControl(key)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', controls[key] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600')}
          >
            <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', controls[key] ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-xl space-y-6">
      {renderToggleGroup('Channel Controls', channelControls)}
      {renderToggleGroup('Transaction Controls', txnControls)}
    </div>
  );
}

// ── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab({ card }: { card: import('../types/card').Card }) {
  const [days, setDays] = useState(30);
  const { data: transactions = [], isLoading } = useCardTransactions({ cardId: card.id });
  const disputeTxn = useDisputeTransaction();

  const cardTxns = transactions.filter((t) => t.cardMasked === card.cardNumberMasked.slice(-8));

  const approved = cardTxns.filter((t) => t.status === 'APPROVED').length;
  const declined = cardTxns.filter((t) => t.status === 'DECLINED').length;

  const txnCols: ColumnDef<CardTransaction, unknown>[] = [
    { accessorKey: 'transactionDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.transactionDate)}</span> },
    { accessorKey: 'merchantName', header: 'Merchant', cell: ({ row }) => <span className="font-medium">{row.original.merchantName}</span> },
    { accessorKey: 'mccDescription', header: 'MCC', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.mccDescription}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
    { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
    { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => (
      <span className={cn('font-mono text-xs font-medium', row.original.responseCode === '00' ? 'text-green-600' : 'text-red-600')}>
        {row.original.responseCode} — {row.original.responseDescription}
      </span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            disputeTxn.mutate(row.original.id, { onSuccess: () => toast.success('Dispute filed'), onError: () => toast.error('Failed to file dispute') });
          }}
          className="px-2 py-1 text-[10px] font-medium rounded border hover:bg-muted transition-colors"
        >
          Dispute
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium">Total: {cardTxns.length}</span>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium dark:bg-green-900/30 dark:text-green-400">Approved: {approved}</span>
        <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium dark:bg-red-900/30 dark:text-red-400">Declined: {declined}</span>
      </div>

      {/* Date range quick buttons */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={cn(
            'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
            days === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}>
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading ? <Skeleton className="h-48" /> : (
        <DataTable columns={txnCols} data={cardTxns} enableGlobalFilter enableExport exportFilename="card-transactions" emptyMessage="No transactions found for this card" />
      )}
    </div>
  );
}

// ── Tokenization Tab ─────────────────────────────────────────────────────────

const WALLET_ICONS: Record<string, string> = {
  APPLE_PAY: '🍎', GOOGLE_PAY: '🟢', SAMSUNG_PAY: '📱', GARMIN_PAY: '⌚', FITBIT_PAY: '⌚',
  MERCHANT_TOKEN: '🏪', ISSUER_TOKEN: '🏦', COF_TOKEN: '💳',
};

function TokenizationTab({ cardId }: { cardId: number }) {
  const { data: tokens = [], isLoading } = useCardTokens(cardId);
  const suspendToken = useSuspendToken();
  const resumeToken = useResumeToken();
  const deactivateToken = useDeactivateToken();

  if (isLoading) return <div className="p-6"><Skeleton className="h-32" /></div>;

  if (tokens.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No digital wallet tokens linked to this card</p>
        <p className="text-xs mt-1">Tokens will appear here when the card is added to digital wallets.</p>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {tokens.map((token) => (
        <div key={token.id} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{WALLET_ICONS[token.walletProvider] ?? '💳'}</span>
              <div>
                <p className="text-sm font-semibold">{token.walletProvider?.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{token.deviceName}</p>
              </div>
            </div>
            <StatusBadge status={token.status} size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Token Suffix:</span> <span className="font-mono">{token.tokenNumberSuffix}</span></div>
            <div><span className="text-muted-foreground">Added:</span> {token.createdAt ? formatDate(token.createdAt) : '—'}</div>
            <div><span className="text-muted-foreground">Last Used:</span> {token.lastUsedAt ? formatRelative(token.lastUsedAt) : 'Never'}</div>
            <div><span className="text-muted-foreground">Txns:</span> {token.transactionCount}</div>
          </div>
          <div className="flex gap-2 pt-1 border-t">
            {token.status === 'ACTIVE' && (
              <button onClick={() => suspendToken.mutate(token.id, { onSuccess: () => toast.success('Token suspended') })}
                className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200">Suspend</button>
            )}
            {token.status === 'SUSPENDED' && (
              <button onClick={() => resumeToken.mutate(token.id, { onSuccess: () => toast.success('Token resumed') })}
                className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200">Resume</button>
            )}
            {token.status !== 'DEACTIVATED' && (
              <button onClick={() => deactivateToken.mutate(token.id, { onSuccess: () => toast.success('Token deactivated') })}
                className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200">Deactivate</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Disputes Tab ─────────────────────────────────────────────────────────────

function DisputesTab({ cardId }: { cardId: number }) {
  const { data: disputes = [], isLoading } = useDisputesByStatus('OPEN');

  const cardDisputes = disputes.filter((d: CardDispute) => d.cardId === cardId);

  if (isLoading) return <div className="p-6"><Skeleton className="h-32" /></div>;

  if (cardDisputes.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No disputes for this card</p>
        <p className="text-xs mt-1">Disputes can be filed from the Transactions tab.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {cardDisputes.map((d: CardDispute) => (
        <div key={d.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs text-muted-foreground">{d.disputeRef}</span>
              <p className="text-sm font-medium">{d.merchantName}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Amount:</span> <span className="font-mono font-medium">{formatMoney(d.disputeAmount, d.disputeCurrency)}</span></div>
            <div><span className="text-muted-foreground">Reason:</span> {d.disputeReason}</div>
            <div><span className="text-muted-foreground">Filed:</span> {formatDate(d.createdAt)}</div>
          </div>
          {d.timeline && d.timeline.length > 0 && (
            <div className="pt-2 border-t space-y-1">
              {d.timeline.slice(0, 3).map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{String(event)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab({ card }: { card: import('../types/card').Card }) {
  const events = [
    { id: '1', action: 'Card Issued', performedBy: 'System', performedAt: card.issuedDate + 'T10:00:00Z', details: `${card.scheme} ${card.cardType} card issued via ${card.deliveryMethod}` },
    { id: '2', action: 'Card Activated', performedBy: 'Branch Officer', performedAt: card.issuedDate + 'T14:00:00Z', details: 'Card activated and ready for use' },
  ];

  if (card.status === 'BLOCKED' || card.status === 'SUSPENDED') {
    events.push({ id: '3', action: `Card ${card.status}`, performedBy: 'System', performedAt: new Date().toISOString(), details: 'Card access restricted' });
  }

  if (card.status === 'EXPIRED') {
    events.push({ id: '3', action: 'Card Expired', performedBy: 'System', performedAt: card.expiryDate + 'T00:00:00Z', details: 'Card has expired' });
  }

  return (
    <div className="p-6">
      <AuditTimeline events={events} />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function CardDetailPage() {
  const { id } = useParams();
  const cardId = parseInt(id || '0');
  const { data: card, isLoading, isError, error } = useCard(cardId);

  useEffect(() => {
    document.title = card ? `Card Detail - ${card.cardNumberMasked} | CBS` : 'Card Detail | CBS';
  }, [card]);

  // Loading
  if (isLoading) {
    return (
      <>
        <PageHeader title="Card Detail" backTo="/cards" />
        <CardPageSkeleton />
      </>
    );
  }

  // Error differentiation
  if (isError || !card) {
    const status = (error as any)?.response?.status;
    let title = 'Card not found';
    let desc = 'The requested card could not be found.';
    if (status === 403) { title = 'Access Denied'; desc = "You don't have permission to view this card."; }
    else if (status && status >= 500) { title = 'Server Error'; desc = 'Failed to load card details.'; }
    else if (!status) { title = 'Network Error'; desc = 'Failed to load card details. Check your connection.'; }

    return (
      <>
        <PageHeader title={title} backTo="/cards" />
        <div className="page-container">
          <div className="rounded-xl border p-12 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            {!status && (
              <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Retry</button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Card ${card.cardNumberMasked}`}
        subtitle={`${card.scheme} ${card.cardType} — ${card.customerName}`}
        backTo="/cards"
      />

      <div className="page-container space-y-6">
        {/* Card Visual + Info Grid */}
        <div className="flex flex-col md:flex-row gap-6">
          <CardVisual card={card} />
          <div className="flex-1">
            <InfoGrid columns={3} items={[
              { label: 'Card Type', value: card.cardType },
              { label: 'Scheme', value: card.scheme },
              { label: 'Status', value: <StatusBadge status={card.status} dot /> },
              { label: 'Linked Account', value: card.accountNumber, mono: true, copyable: true },
              { label: 'Issue Date', value: card.issuedDate, format: 'date' },
              { label: 'Expiry Date', value: card.expiryDate },
              { label: 'Delivery', value: card.deliveryMethod?.replace(/_/g, ' ') ?? '—' },
              { label: 'Customer', value: card.customerName },
              { label: 'Customer ID', value: card.customerId, mono: true },
            ]} />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions card={card} />

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-5">
                    <h3 className="text-sm font-semibold mb-3">Card Information</h3>
                    <InfoGrid columns={2} items={[
                      { label: 'Type', value: card.cardType },
                      { label: 'Scheme', value: card.scheme },
                      { label: 'Issue Date', value: card.issuedDate, format: 'date' },
                      { label: 'Expiry', value: card.expiryDate },
                      { label: 'Status', value: <StatusBadge status={card.status} dot /> },
                      { label: 'Delivery', value: card.deliveryMethod?.replace(/_/g, ' ') ?? '—' },
                    ]} />
                  </div>
                  <div className="rounded-lg border p-5">
                    <h3 className="text-sm font-semibold mb-3">Linked Account</h3>
                    <InfoGrid columns={2} items={[
                      { label: 'Account Number', value: card.accountNumber, mono: true, copyable: true },
                      { label: 'Account ID', value: card.accountId },
                    ]} />
                    <button onClick={() => window.location.href = `/accounts/${card.accountId}`}
                      className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline">
                      <Eye className="w-3.5 h-3.5" /> View Account
                    </button>
                  </div>
                </div>

                {/* Card Limits as progress bars */}
                <div className="rounded-lg border p-5">
                  <h3 className="text-sm font-semibold mb-4">Card Limits</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Daily ATM', used: 0, limit: 100000 },
                      { label: 'Daily POS', used: 0, limit: 500000 },
                      { label: 'Online Per-Txn', used: 0, limit: 200000 },
                      { label: 'Monthly Total', used: 0, limit: 5000000 },
                    ].map((l) => (
                      <div key={l.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{l.label}</span>
                          <span className="text-muted-foreground font-mono">{formatMoney(l.used)} / {formatMoney(l.limit)}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${l.limit > 0 ? (l.used / l.limit) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          { id: 'controls', label: 'Controls', content: <ControlsTab card={card} /> },
          { id: 'transactions', label: 'Transactions', content: <TransactionsTab card={card} /> },
          { id: 'tokens', label: 'Tokenization', content: <TokenizationTab cardId={card.id} /> },
          { id: 'disputes', label: 'Disputes', content: <DisputesTab cardId={card.id} /> },
          { id: 'audit', label: 'Audit', content: <AuditTab card={card} /> },
        ]} />
      </div>
    </>
  );
}
