import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { accountDetailApi } from '../api/accountDetailApi';

type PostingType = 'DEBIT' | 'CREDIT' | 'TRANSFER';
const CHANNELS = ['BRANCH', 'SYSTEM', 'API', 'MOBILE', 'INTERNET', 'ATM', 'POS', 'CHEQUE'];

export function TransactionPostingPage() {
  useEffect(() => { document.title = 'Post Transaction | CBS'; }, []);
  const [type, setType] = useState<PostingType>('CREDIT');
  const [accountNumber, setAccountNumber] = useState('');
  const [contraAccount, setContraAccount] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');
  const [channel, setChannel] = useState('BRANCH');
  const [externalRef, setExternalRef] = useState('');
  const [contraGlCode, setContraGlCode] = useState('');
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);

  const debitMut = useMutation({
    mutationFn: () => accountDetailApi.postDebit({ accountNumber, amount, narration, channel, externalRef: externalRef || undefined, contraAccountNumber: contraAccount || undefined, contraGlCode: contraGlCode || undefined }),
    onSuccess: (d) => { toast.success('Debit posted'); setSuccess(d); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Debit failed'),
  });
  const creditMut = useMutation({
    mutationFn: () => accountDetailApi.postCredit({ accountNumber, amount, narration, channel, externalRef: externalRef || undefined, contraAccountNumber: contraAccount || undefined, contraGlCode: contraGlCode || undefined }),
    onSuccess: (d) => { toast.success('Credit posted'); setSuccess(d); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Credit failed'),
  });
  const transferMut = useMutation({
    mutationFn: () => accountDetailApi.postTransfer({ fromAccountNumber: accountNumber, toAccountNumber: contraAccount, amount, narration }),
    onSuccess: (d) => { toast.success('Transfer posted'); setSuccess(d); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Transfer failed'),
  });

  const isPending = debitMut.isPending || creditMut.isPending || transferMut.isPending;

  const handlePost = () => {
    if (type === 'DEBIT') debitMut.mutate();
    else if (type === 'CREDIT') creditMut.mutate();
    else transferMut.mutate();
  };

  const reset = () => { setAccountNumber(''); setContraAccount(''); setAmount(0); setNarration(''); setExternalRef(''); setContraGlCode(''); setSuccess(null); };
  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-lg font-semibold">Transaction Posted</h2>
        <p className="text-sm text-muted-foreground">{type} of {formatMoney(amount)} on account {accountNumber}</p>
        {typeof success.transactionRef === 'string' && <p className="text-xs font-mono text-muted-foreground">Ref: {success.transactionRef}</p>}
        <div className="flex gap-3 justify-center"><button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Post Another</button></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Post Transaction" subtitle="Debit, credit, or transfer between accounts" backTo="/accounts" />
      <div className="page-container">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'CREDIT' as PostingType, label: 'Credit', icon: ArrowDownLeft, color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
              { key: 'DEBIT' as PostingType, label: 'Debit', icon: ArrowUpRight, color: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
              { key: 'TRANSFER' as PostingType, label: 'Transfer', icon: ArrowLeftRight, color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' },
            ]).map(t => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={cn('p-4 rounded-xl border-2 text-center transition-all', type === t.key ? t.color : 'border-border hover:border-primary/30')}>
                <t.icon className="w-6 h-6 mx-auto mb-1" /><span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{type === 'TRANSFER' ? 'From Account *' : 'Account Number *'}</label>
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" className={cn(fc, 'font-mono')} /></div>

            {type === 'TRANSFER' && (
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">To Account *</label>
                <input value={contraAccount} onChange={e => setContraAccount(e.target.value)} placeholder="Destination account" className={cn(fc, 'font-mono')} /></div>
            )}

            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Amount *</label>
              <input type="number" step="0.01" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="0.00" className={cn(fc, 'font-mono text-lg font-bold')} /></div>

            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Narration *</label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Transaction description" className={fc} /></div>

            {type !== 'TRANSFER' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Contra Account</label>
                    <input value={contraAccount} onChange={e => setContraAccount(e.target.value)} placeholder="Contra account number (optional)" className={cn(fc, 'font-mono')} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Contra GL Code</label>
                    <input value={contraGlCode} onChange={e => setContraGlCode(e.target.value)} placeholder="GL code (if no contra account)" className={cn(fc, 'font-mono')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Channel</label>
                    <select value={channel} onChange={e => setChannel(e.target.value)} className={fc}>
                      {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">External Ref</label>
                    <input value={externalRef} onChange={e => setExternalRef(e.target.value)} placeholder="Optional" className={cn(fc, 'font-mono')} /></div>
                </div>
              </>
            )}

            <button onClick={handlePost} disabled={!accountNumber || !amount || !narration || isPending || (type === 'TRANSFER' && !contraAccount)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Post {type}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
