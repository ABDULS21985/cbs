import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Phone } from 'lucide-react';

import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { PortalPageHero } from '../components/PortalPageHero';
import { portalApi } from '../api/portalApi';

const NETWORKS = [
  { id: 'MTN', name: 'MTN', color: 'bg-yellow-400 text-black' },
  { id: 'GLO', name: 'Glo', color: 'bg-green-600 text-white' },
  { id: 'AIRTEL', name: 'Airtel', color: 'bg-red-600 text-white' },
  { id: '9MOBILE', name: '9mobile', color: 'bg-green-700 text-white' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export function PortalAirtimePage() {
  useEffect(() => {
    document.title = 'Airtime & Data | BellBank';
  }, []);

  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [purchaseType, setPurchaseType] = useState<'AIRTIME' | 'DATA'>('AIRTIME');
  const [accountId, setAccountId] = useState(0);
  const [success, setSuccess] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['portal', 'accounts'],
    queryFn: () => portalApi.getAccounts(),
  });

  const purchaseMut = useMutation({
    mutationFn: () => portalApi.purchaseAirtime({ network, phone, amount, type: purchaseType, accountId }),
    onSuccess: () => {
      toast.success(`${purchaseType === 'AIRTIME' ? 'Airtime' : 'Data'} purchased!`);
      setSuccess(true);
    },
    onError: () => toast.error('Purchase failed'),
  });

  const resetFlow = () => {
    setSuccess(false);
    setNetwork('');
    setPhone('');
    setAmount(0);
    setAccountId(0);
    setPurchaseType('AIRTIME');
  };

  return (
    <div className="portal-page-shell">
      <PortalPageHero
        icon={Phone}
        eyebrow="Portal Payments"
        title="Airtime and Data"
        description="Top up from any funded account with a lighter, faster checkout flow for everyday value purchases."
        chips={[
          purchaseType === 'AIRTIME' ? 'Airtime top-up' : 'Data bundle',
          network || 'Select a network',
          phone ? `+234 ${phone}` : 'Enter destination number',
        ]}
        metrics={[
          { label: 'Networks', value: String(NETWORKS.length) },
          { label: 'Quick picks', value: String(QUICK_AMOUNTS.length) },
          { label: 'Funding accounts', value: String(accounts.length || 0) },
        ]}
      />

      <section className="portal-panel p-6 space-y-6">
        {success ? (
          <div className="portal-empty-state py-16">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Purchase Successful</h2>
              <p className="text-sm text-muted-foreground">
                {formatMoney(amount)} {purchaseType.toLowerCase()} sent to {phone}.
              </p>
            </div>
            <button onClick={resetFlow} className="portal-action-button">
              Buy Again
            </button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div className="space-y-5">
              <div className="flex rounded-[1rem] border border-border/70 bg-background/60 p-1">
                {(['AIRTIME', 'DATA'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPurchaseType(type)}
                    className={cn(
                      'flex-1 rounded-[0.85rem] px-4 py-2.5 text-sm font-medium transition-colors',
                      purchaseType === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type === 'AIRTIME' ? 'Airtime' : 'Data Bundle'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Network</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {NETWORKS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setNetwork(item.id)}
                      className={cn(
                        'portal-panel p-4 text-center transition-all hover:border-primary/25',
                        network === item.id && 'border-primary/30 bg-primary/5',
                      )}
                    >
                      <div className={cn('mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold', item.color)}>
                        {item.name[0]}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Phone Number</span>
                <div className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-background/60 px-3 py-2">
                  <span className="text-sm font-medium text-muted-foreground">+234</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                    placeholder="8012345678"
                    maxLength={10}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Amount</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value)}
                      className={cn(
                        'portal-filter-chip justify-center px-4 py-3 text-sm',
                        amount === value && 'bg-primary text-primary-foreground border-primary',
                      )}
                      data-active={amount === value ? 'true' : 'false'}
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  placeholder="Custom amount"
                  className="portal-inline-input font-semibold"
                />
              </div>
            </div>

            <aside className="space-y-4">
              <div className="portal-panel portal-panel-muted p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Purchase Summary</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{formatMoney(amount || 0)}</p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Type</span>
                    <span className="font-medium text-foreground">
                      {purchaseType === 'AIRTIME' ? 'Airtime' : 'Data Bundle'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Network</span>
                    <span className="font-medium text-foreground">{network || 'Pending'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Destination</span>
                    <span className="font-medium text-foreground">{phone || 'Pending'}</span>
                  </div>
                </div>
              </div>

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
                onClick={() => purchaseMut.mutate()}
                disabled={!network || !phone || !amount || !accountId || purchaseMut.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {purchaseMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Buy {purchaseType === 'AIRTIME' ? 'Airtime' : 'Data'} - {formatMoney(amount || 0)}
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
