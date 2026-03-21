import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Zap, Droplets, Wifi, Tv, Shield, Building2, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { portalApi } from '../api/portalApi';

const CAT_ICONS: Record<string, React.ElementType> = { Electricity: Zap, Water: Droplets, Internet: Wifi, TV: Tv, Insurance: Shield, Government: Building2 };
const CAT_COLORS: Record<string, string> = { Electricity: 'bg-amber-100 text-amber-600', Water: 'bg-blue-100 text-blue-600', Internet: 'bg-purple-100 text-purple-600', TV: 'bg-red-100 text-red-600', Insurance: 'bg-green-100 text-green-600', Government: 'bg-gray-100 text-gray-600' };

export function PortalBillPaymentPage() {
  useEffect(() => { document.title = 'Pay Bills | BellBank'; }, []);
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBiller, setSelectedBiller] = useState<Record<string, unknown> | null>(null);
  const [customerRef, setCustomerRef] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(0);
  const [validated, setValidated] = useState<Record<string, unknown> | null>(null);

  const { data: billers = [] } = useQuery({ queryKey: ['portal', 'billers'], queryFn: () => portalApi.getBillers() });
  const { data: accounts = [] } = useQuery({ queryKey: ['portal', 'accounts'], queryFn: () => portalApi.getAccounts() });

  const validateMut = useMutation({ mutationFn: () => portalApi.validateBiller(selectedBiller?.code as string || '', customerRef), onSuccess: (d) => { setValidated(d); setStep(3); } });
  const payMut = useMutation({
    mutationFn: () => portalApi.payBill({ billerCode: selectedBiller?.code as string, billerName: selectedBiller?.name as string, customerRef, amount, accountId }),
    onSuccess: () => { toast.success('Bill paid successfully!'); setStep(4); },
    onError: () => toast.error('Payment failed'),
  });

  const categories = useMemo(() => [...new Set((billers as Record<string, unknown>[]).map(b => b.category as string))], [billers]);
  const filteredBillers = useMemo(() => (billers as Record<string, unknown>[]).filter(b => b.category === selectedCategory), [billers, selectedCategory]);

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="p-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>}
        <h1 className="text-lg font-semibold">Pay Bills</h1>
      </div>

      {/* Step 0: Categories */}
      {step === 0 && (
        <div className="grid grid-cols-3 gap-3">
          {categories.map(cat => {
            const Icon = CAT_ICONS[cat] || Zap;
            return (
              <button key={cat} onClick={() => { setSelectedCategory(cat); setStep(1); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all">
                <div className={cn('p-3 rounded-full', CAT_COLORS[cat] || 'bg-muted')}><Icon className="w-5 h-5" /></div>
                <span className="text-xs font-medium">{cat}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 1: Select biller */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{selectedCategory} providers</p>
          {filteredBillers.map(b => (
            <button key={b.id as number} onClick={() => { setSelectedBiller(b); setAmount(b.fixedAmount ? (b.amount as number) : 0); setStep(2); }}
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 text-left">
              <span className="text-sm font-medium">{b.name as string}</span>
              {b.fixedAmount && <span className="text-xs font-mono">{formatMoney(b.amount as number)}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Reference + amount */}
      {step === 2 && selectedBiller && (
        <div className="space-y-4">
          <p className="text-sm font-medium">{selectedBiller.name as string}</p>
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{selectedBiller.refLabel as string || 'Reference'} *</label>
            <input value={customerRef} onChange={e => setCustomerRef(e.target.value)} className={fc} /></div>
          {!selectedBiller.fixedAmount && (
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Amount *</label>
              <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className={cn(fc, 'font-mono text-lg')} /></div>
          )}
          <button onClick={() => validateMut.mutate()} disabled={!customerRef || validateMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {validateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Validate & Continue
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Biller</span><span className="font-medium">{selectedBiller?.name as string}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{customerRef}</span></div>
            {validated?.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{validated.customerName as string}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-bold text-lg">{formatMoney(amount)}</span></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Pay from</label>
            <select value={accountId} onChange={e => setAccountId(Number(e.target.value))} className={fc}>
              <option value={0}>Select account</option>
              {(accounts as Record<string, unknown>[]).map(a => <option key={a.id as number} value={a.id as number}>{a.accountName as string} — {formatMoney(a.availableBalance as number)}</option>)}
            </select></div>
          <button onClick={() => payMut.mutate()} disabled={!accountId || payMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {payMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Pay {formatMoney(amount)}
          </button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold">Payment Successful!</h2>
          <p className="text-sm text-muted-foreground">{formatMoney(amount)} paid to {selectedBiller?.name as string}</p>
          <button onClick={() => { setStep(0); setSelectedBiller(null); setCustomerRef(''); setAmount(0); setValidated(null); }}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Pay Another Bill</button>
        </div>
      )}
    </div>
  );
}
