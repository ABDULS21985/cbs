import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { portalApi } from '../api/portalApi';

const NETWORKS = [
  { id: 'MTN', name: 'MTN', color: 'bg-yellow-400 text-black' },
  { id: 'GLO', name: 'Glo', color: 'bg-green-600 text-white' },
  { id: 'AIRTEL', name: 'Airtel', color: 'bg-red-600 text-white' },
  { id: '9MOBILE', name: '9mobile', color: 'bg-green-700 text-white' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export function PortalAirtimePage() {
  useEffect(() => { document.title = 'Airtime & Data | BellBank'; }, []);
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(0);
  const [purchaseType, setPurchaseType] = useState<'AIRTIME' | 'DATA'>('AIRTIME');
  const [accountId, setAccountId] = useState(0);
  const [success, setSuccess] = useState(false);

  const { data: accounts = [] } = useQuery({ queryKey: ['portal', 'accounts'], queryFn: () => portalApi.getAccounts() });

  const purchaseMut = useMutation({
    mutationFn: () => portalApi.purchaseAirtime({ network, phone, amount, type: purchaseType, accountId }),
    onSuccess: () => { toast.success(`${purchaseType === 'AIRTIME' ? 'Airtime' : 'Data'} purchased!`); setSuccess(true); },
    onError: () => toast.error('Purchase failed'),
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-lg font-semibold">Purchase Successful!</h2>
        <p className="text-sm text-muted-foreground">{formatMoney(amount)} {purchaseType.toLowerCase()} sent to {phone}</p>
        <button onClick={() => { setSuccess(false); setAmount(0); setPhone(''); }} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Buy Again</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-lg font-semibold">Airtime & Data</h1>

      {/* Type toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        {(['AIRTIME', 'DATA'] as const).map(t => (
          <button key={t} onClick={() => setPurchaseType(t)}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-colors', purchaseType === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
            {t === 'AIRTIME' ? 'Airtime' : 'Data Bundle'}
          </button>
        ))}
      </div>

      {/* Network selection */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Select Network</p>
        <div className="grid grid-cols-4 gap-3">
          {NETWORKS.map(n => (
            <button key={n.id} onClick={() => setNetwork(n.id)}
              className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                network === n.id ? 'border-primary shadow-sm' : 'border-transparent hover:border-muted')}>
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold', n.color)}>{n.name[0]}</div>
              <span className="text-xs font-medium">{n.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">+234</span>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="8012345678" maxLength={10} className={cn(fc, 'font-mono')} />
        </div>
      </div>

      {/* Quick amounts */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Amount</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(a)}
              className={cn('py-2.5 rounded-lg border text-sm font-medium transition-colors',
                amount === a ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
              {formatMoney(a)}
            </button>
          ))}
        </div>
        <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="Custom amount" className={cn(fc, 'mt-2 font-mono')} />
      </div>

      {/* Account */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Pay from</label>
        <select value={accountId} onChange={e => setAccountId(Number(e.target.value))} className={fc}>
          <option value={0}>Select account</option>
          {(accounts as unknown as Record<string, unknown>[]).map(a => <option key={a.id as number} value={a.id as number}>{a.accountName as string} — {formatMoney(a.availableBalance as number)}</option>)}
        </select>
      </div>

      {/* Submit */}
      <button onClick={() => purchaseMut.mutate()} disabled={!network || !phone || !amount || !accountId || purchaseMut.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        {purchaseMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
        Buy {purchaseType === 'AIRTIME' ? 'Airtime' : 'Data'} — {formatMoney(amount)}
      </button>
    </div>
  );
}
