import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Check, Loader2, User, CreditCard,
  Truck, Building2, Wallet, BadgeDollarSign,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';
import { CardPreview, type CardTier } from '../components/CardPreview';
import { useIssueCard } from '../hooks/useCardData';
import type { Card, CardType, CardScheme } from '../types/card';
import type { IssueCardInput } from '../api/cardApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerInfo {
  id: number;
  fullName: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface AccountInfo {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType?: string;
  availableBalance?: number;
  currencyCode?: string;
  status?: string;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Customer', icon: User },
  { label: 'Configure', icon: CreditCard },
  { label: 'Review', icon: Check },
];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((s, i) => {
        const done = step > i + 1;
        const current = step === i + 1;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                done && 'bg-primary border-primary text-primary-foreground',
                current && 'bg-background border-primary text-primary shadow-sm',
                !done && !current && 'bg-background border-border text-muted-foreground',
              )}>
                {done ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={cn('text-xs font-medium', current ? 'text-primary' : 'text-muted-foreground')}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('w-16 h-0.5 mx-2 mb-5', done ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Radio Card ───────────────────────────────────────────────────────────────

function RadioCard({
  selected, onClick, children, className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left p-4 rounded-xl border-2 transition-all w-full',
        selected ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-border hover:border-primary/40',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CardRequestPage() {
  useEffect(() => { document.title = 'Request Card | CBS'; }, []);

  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [cardType, setCardType] = useState<CardType>('DEBIT');
  const [scheme, setScheme] = useState<CardScheme>('VISA');
  const [cardholderName, setCardholderName] = useState('');
  const [tier, setTier] = useState<CardTier>('CLASSIC');
  const [deliveryMethod, setDeliveryMethod] = useState('BRANCH_PICKUP');
  const [branchCode, setBranchCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [issuedCard, setIssuedCard] = useState<Card | null>(null);

  const issueCard = useIssueCard();

  // Fetch accounts for selected customer
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'customer', customerId],
    queryFn: () => apiGet<AccountInfo[]>(`/api/v1/accounts/customer/${customerId}`),
    enabled: !!customer && !!customerId,
    staleTime: 60_000,
  });

  // Fetch customer on blur
  const fetchCustomer = useCallback(async () => {
    const id = parseInt(customerId, 10);
    if (!id || id <= 0) return;
    setCustomerLoading(true);
    try {
      const data = await apiGet<CustomerInfo>(`/api/v1/customers/${id}`);
      setCustomer(data);
      setCardholderName(data.fullName ?? data.displayName ?? '');
    } catch {
      toast.error('Customer not found');
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
    }
  }, [customerId]);

  const handleSubmit = () => {
    if (!customer || !selectedAccount) return;
    const input: IssueCardInput = {
      customerId: customer.id,
      cardType,
      scheme,
      accountId: selectedAccount.id,
      cardholderName,
      deliveryMethod,
      branchCode: deliveryMethod === 'BRANCH_PICKUP' ? branchCode : undefined,
      cardTier: tier,
    };
    issueCard.mutate(input, {
      onSuccess: (card) => {
        setIssuedCard(card);
        toast.success('Card issued successfully!');
      },
    });
  };

  // Success state
  if (issuedCard) {
    return (
      <>
        <PageHeader title="Card Issued" backTo="/cards" />
        <div className="page-container max-w-2xl">
          <div className="rounded-xl border bg-card p-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-300">Card Issued Successfully!</h2>
            <CardPreview
              scheme={scheme}
              cardType={cardType}
              tier={tier}
              cardholderName={cardholderName}
              maskedNumber={issuedCard.cardNumberMasked}
            />
            <InfoGrid
              columns={3}
              items={[
                { label: 'Card Number', value: issuedCard.cardNumberMasked },
                { label: 'Status', value: issuedCard.status },
                { label: 'Delivery', value: issuedCard.deliveryMethod },
              ]}
            />
            <div className="flex gap-3">
              <Link to={`/cards/${issuedCard.id}`} className="btn-primary">View Card</Link>
              <Link to="/cards" className="btn-secondary">Back to Cards</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Request New Card" subtitle="Card issuance wizard" backTo="/cards" />
      <div className="page-container max-w-3xl">
        <div className="rounded-xl border bg-card p-6 sm:p-8">
          <StepIndicator step={step} />

          {/* ── Step 1: Customer & Account ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Select Customer & Account</h2>
                <p className="text-sm text-muted-foreground mt-1">Search for the customer and select the linked account.</p>
              </div>

              <div>
                <label className="text-sm font-medium">Customer ID</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    className="flex-1 input"
                    placeholder="Enter customer ID"
                    value={customerId}
                    onChange={(e) => { setCustomerId(e.target.value); setCustomer(null); setSelectedAccount(null); }}
                    onBlur={fetchCustomer}
                    onKeyDown={(e) => e.key === 'Enter' && fetchCustomer()}
                  />
                  {customerLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground self-center" />}
                </div>
              </div>

              {customer && (
                <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{customer.fullName ?? customer.displayName}</p>
                      <p className="text-xs text-muted-foreground">{customer.email} · {customer.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {customer && accounts.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Account</label>
                  <div className="space-y-2">
                    {accounts.map((acc) => (
                      <RadioCard
                        key={acc.id}
                        selected={selectedAccount?.id === acc.id}
                        onClick={() => setSelectedAccount(acc)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium font-mono">{acc.accountNumber}</p>
                            <p className="text-xs text-muted-foreground">{acc.accountName} · {acc.accountType ?? 'Account'}</p>
                          </div>
                          <span className="font-mono text-sm font-semibold">
                            {acc.availableBalance != null ? formatMoney(acc.availableBalance, acc.currencyCode) : '—'}
                          </span>
                        </div>
                      </RadioCard>
                    ))}
                  </div>
                </div>
              )}

              {customer && accounts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No accounts found for this customer.</p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  disabled={!customer || !selectedAccount}
                  onClick={() => setStep(2)}
                  className={cn('flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    customer && selectedAccount ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Card Configuration ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Configure Card</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose the card type, scheme, and delivery preferences.</p>
              </div>

              {/* Live preview */}
              <div className="flex justify-center py-4">
                <CardPreview scheme={scheme} cardType={cardType} tier={tier} cardholderName={cardholderName} />
              </div>

              {/* Card Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Card Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { type: 'DEBIT' as const, icon: Wallet, desc: 'Linked to account balance' },
                    { type: 'CREDIT' as const, icon: BadgeDollarSign, desc: 'Credit line with billing cycle' },
                    { type: 'PREPAID' as const, icon: CreditCard, desc: 'Pre-loaded value card' },
                  ]).map((opt) => (
                    <RadioCard key={opt.type} selected={cardType === opt.type} onClick={() => setCardType(opt.type)}>
                      <opt.icon className={cn('w-5 h-5 mb-2', cardType === opt.type ? 'text-primary' : 'text-muted-foreground')} />
                      <p className={cn('text-sm font-semibold', cardType === opt.type && 'text-primary')}>{opt.type}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </RadioCard>
                  ))}
                </div>
              </div>

              {/* Card Scheme */}
              <div>
                <label className="text-sm font-medium mb-2 block">Card Scheme</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { s: 'VISA' as const, color: 'bg-blue-600', label: 'VISA' },
                    { s: 'MASTERCARD' as const, color: 'bg-red-600', label: 'Mastercard' },
                    { s: 'VERVE' as const, color: 'bg-slate-800', label: 'Verve' },
                  ]).map((opt) => (
                    <RadioCard key={opt.s} selected={scheme === opt.s} onClick={() => setScheme(opt.s)}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-6 h-4 rounded-sm', opt.color)} />
                        <p className={cn('text-sm font-semibold', scheme === opt.s && 'text-primary')}>{opt.label}</p>
                      </div>
                    </RadioCard>
                  ))}
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="text-sm font-medium">Cardholder Name</label>
                <input
                  className="w-full mt-1 input uppercase"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  maxLength={26}
                />
                <p className="text-xs text-muted-foreground mt-1">As it will appear on the card (max 26 characters)</p>
              </div>

              {/* Card Tier */}
              <div>
                <label className="text-sm font-medium mb-2 block">Card Tier</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['CLASSIC', 'GOLD', 'PLATINUM', 'INFINITE'] as CardTier[]).map((t) => (
                    <RadioCard key={t} selected={tier === t} onClick={() => setTier(t)}>
                      <p className={cn('text-xs font-bold uppercase tracking-wider', tier === t && 'text-primary')}>{t}</p>
                    </RadioCard>
                  ))}
                </div>
              </div>

              {/* Delivery Method */}
              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <RadioCard selected={deliveryMethod === 'BRANCH_PICKUP'} onClick={() => setDeliveryMethod('BRANCH_PICKUP')}>
                    <Building2 className={cn('w-5 h-5 mb-1', deliveryMethod === 'BRANCH_PICKUP' ? 'text-primary' : 'text-muted-foreground')} />
                    <p className={cn('text-sm font-semibold', deliveryMethod === 'BRANCH_PICKUP' && 'text-primary')}>Branch Pickup</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Available in 3-5 business days</p>
                  </RadioCard>
                  <RadioCard selected={deliveryMethod === 'COURIER'} onClick={() => setDeliveryMethod('COURIER')}>
                    <Truck className={cn('w-5 h-5 mb-1', deliveryMethod === 'COURIER' ? 'text-primary' : 'text-muted-foreground')} />
                    <p className={cn('text-sm font-semibold', deliveryMethod === 'COURIER' && 'text-primary')}>Courier Delivery</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Delivered in 7-10 business days</p>
                  </RadioCard>
                </div>
              </div>

              {deliveryMethod === 'BRANCH_PICKUP' && (
                <div>
                  <label className="text-sm font-medium">Branch Code</label>
                  <input className="w-full mt-1 input" placeholder="e.g. LG001" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!cardholderName.trim()}
                  className={cn('flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    cardholderName.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Submit ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Review & Issue</h2>
                <p className="text-sm text-muted-foreground mt-1">Confirm all details before issuing the card.</p>
              </div>

              <div className="flex justify-center py-4">
                <CardPreview scheme={scheme} cardType={cardType} tier={tier} cardholderName={cardholderName} />
              </div>

              <div className="rounded-lg border p-5">
                <InfoGrid
                  columns={3}
                  items={[
                    { label: 'Customer', value: customer?.fullName ?? customer?.displayName ?? '' },
                    { label: 'Account', value: selectedAccount?.accountNumber ?? '' },
                    { label: 'Card Type', value: cardType },
                    { label: 'Scheme', value: scheme },
                    { label: 'Tier', value: tier },
                    { label: 'Cardholder', value: cardholderName },
                    { label: 'Delivery', value: deliveryMethod.replace('_', ' ') },
                    ...(branchCode ? [{ label: 'Branch', value: branchCode }] : []),
                  ]}
                />
              </div>

              {/* Terms */}
              <div className="rounded-lg border p-5 bg-muted/20">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-input"
                  />
                  <p className="text-sm">
                    I confirm the customer has been verified and consents to card issuance per the bank's card issuance policy.
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!termsAccepted || issueCard.isPending}
                  className={cn('flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors min-w-[140px] justify-center',
                    termsAccepted && !issueCard.isPending ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {issueCard.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Issuing...</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Issue Card</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
