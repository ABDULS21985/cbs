import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
  Tv,
  Building2,
  Droplets,
  Wifi,
  Zap,
} from 'lucide-react';

import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi } from '../api/portalApi';

const CAT_ICONS: Record<string, ElementType> = {
  Electricity: Zap,
  Water: Droplets,
  Internet: Wifi,
  TV: Tv,
  Insurance: Shield,
  Government: Building2,
};

const CAT_COLORS: Record<string, string> = {
  Electricity: 'bg-amber-100 text-amber-600',
  Water: 'bg-blue-100 text-blue-600',
  Internet: 'bg-violet-100 text-violet-600',
  TV: 'bg-rose-100 text-rose-600',
  Insurance: 'bg-emerald-100 text-emerald-600',
  Government: 'bg-slate-100 text-slate-600',
};

const STEP_LABELS = [
  'Choose a category',
  'Select a biller',
  'Validate the reference',
  'Review and submit',
  'Receipt ready',
];

export function PortalBillPaymentPage() {
  useEffect(() => {
    document.title = 'Pay Bills | BellBank';
  }, []);

  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBiller, setSelectedBiller] = useState<Record<string, unknown> | null>(null);
  const [customerRef, setCustomerRef] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(0);
  const [validated, setValidated] = useState<Record<string, unknown> | null>(null);

  const { data: billers = [] } = useQuery({
    queryKey: ['portal', 'billers'],
    queryFn: () => portalApi.getBillers(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  const validateMut = useMutation({
    mutationFn: () => portalApi.validateBiller((selectedBiller?.code as string) || '', customerRef),
    onSuccess: (data) => {
      setValidated(data);
      setStep(3);
    },
  });

  const payMut = useMutation({
    mutationFn: () =>
      portalApi.payBill({
        billerCode: selectedBiller?.code as string,
        billerName: selectedBiller?.name as string,
        customerRef,
        amount,
        accountId,
      }),
    onSuccess: () => {
      toast.success('Bill paid successfully!');
      setStep(4);
    },
    onError: () => toast.error('Payment failed'),
  });

  const categories = useMemo(
    () => [...new Set((billers as Record<string, unknown>[]).map((biller) => biller.category as string))],
    [billers],
  );

  const filteredBillers = useMemo(
    () => (billers as Record<string, unknown>[]).filter((biller) => biller.category === selectedCategory),
    [billers, selectedCategory],
  );

  const resetFlow = () => {
    setStep(0);
    setSelectedCategory('');
    setSelectedBiller(null);
    setCustomerRef('');
    setAmount(0);
    setAccountId(0);
    setValidated(null);
  };

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={Zap}
        eyebrow="Portal Payments"
        title="Pay Bills"
        description="Move from selection to validation and payment confirmation in one guided workspace."
        chips={[
          STEP_LABELS[step],
          selectedCategory || 'Utilities and subscriptions',
          selectedBiller ? String(selectedBiller.name) : 'Choose a biller',
        ]}
        metrics={[
          { label: 'Categories', value: String(categories.length || 0) },
          { label: 'Billers', value: String(filteredBillers.length || billers.length || 0) },
          { label: 'Funding accounts', value: String(accounts.length || 0) },
        ]}
      />

      <section className="portal-panel p-6 space-y-6">
        {step > 0 ? (
          <button
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            className="portal-action-button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : null}

        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Choose a bill category</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with the service family, then pick a specific biller and validate the customer reference.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => {
                const Icon = CAT_ICONS[category] || Zap;

                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setStep(1);
                    }}
                    className="portal-panel p-5 text-left transition-all hover:border-primary/25 hover:shadow-md"
                  >
                    <div className={cn('mb-4 inline-flex rounded-2xl p-3', CAT_COLORS[category] || 'bg-muted')}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold text-foreground">{category}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {filteredBillers.filter((biller) => biller.category === category).length ||
                        (billers as Record<string, unknown>[]).filter((biller) => biller.category === category).length}{' '}
                      providers available
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{selectedCategory} Providers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the biller, then confirm the reference before payment.
              </p>
            </div>

            <div className="grid gap-3">
              {filteredBillers.map((biller) => (
                <button
                  key={biller.id as number}
                  onClick={() => {
                    setSelectedBiller(biller);
                    setAmount(biller.fixedAmount ? (biller.amount as number) : 0);
                    setStep(2);
                  }}
                  className="portal-panel p-4 text-left transition-colors hover:border-primary/25"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{biller.name as string}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(biller.refLabel as string) || 'Customer reference required'}
                      </p>
                    </div>
                    {biller.fixedAmount ? (
                      <span className="portal-page-hero-chip">{formatMoney(biller.amount as number)}</span>
                    ) : (
                      <span className="portal-page-hero-chip">Variable amount</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 && selectedBiller ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{selectedBiller.name as string}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the reference tied to this biller so the portal can validate the customer before payment.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {(selectedBiller.refLabel as string) || 'Reference'} *
                </span>
                <input
                  value={customerRef}
                  onChange={(event) => setCustomerRef(event.target.value)}
                  className="portal-inline-input"
                />
              </label>

              {!selectedBiller.fixedAmount ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Amount *</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    className="portal-inline-input text-lg font-semibold"
                  />
                </label>
              ) : null}

              <button
                onClick={() => validateMut.mutate()}
                disabled={!customerRef || validateMut.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {validateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Validate and Continue
              </button>
            </div>

            <aside className="portal-panel portal-panel-muted p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payment Snapshot</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatMoney(amount || 0)}
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Category</span>
                  <span className="font-medium text-foreground">{selectedCategory}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Biller</span>
                  <span className="font-medium text-foreground">{selectedBiller.name as string}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Pricing</span>
                  <span className="font-medium text-foreground">
                    {selectedBiller.fixedAmount ? 'Fixed' : 'Variable'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="portal-panel portal-panel-muted p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Review Payment</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Biller</span>
                  <span className="font-medium text-foreground">{selectedBiller?.name as string}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-foreground">{customerRef}</span>
                </div>
                {validated?.customerName ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium text-foreground">{validated.customerName as string}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-lg font-semibold text-foreground">{formatMoney(amount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Pay from</span>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(Number(event.target.value))}
                  className="portal-inline-input"
                >
                  <option value={0}>Select account</option>
                  {(accounts as Record<string, unknown>[]).map((account) => (
                    <option key={account.id as number} value={account.id as number}>
                      {account.accountName as string} - {formatMoney(account.availableBalance as number)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => payMut.mutate()}
                disabled={!accountId || payMut.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Pay {formatMoney(amount)}
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="portal-empty-state py-16">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Payment Successful</h2>
              <p className="text-sm text-muted-foreground">
                {formatMoney(amount)} paid to {selectedBiller?.name as string}.
              </p>
            </div>
            <button onClick={resetFlow} className="portal-action-button">
              Pay Another Bill
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
