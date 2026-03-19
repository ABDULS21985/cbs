import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { MoneyInput } from '@/components/shared/MoneyInput';

type Step = 'form' | 'review' | 'otp' | 'success';

export function PortalTransferPage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ fromAccount: '0123456789', toAccount: '', beneficiaryName: '', amount: 0, narration: '' });
  const [otp, setOtp] = useState('');

  const update = (field: string, value: string | number) => setForm((prev) => ({ ...prev, [field]: value }));

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Transfer Successful</h2>
        <p className="text-muted-foreground">{formatMoney(form.amount, 'NGN')} sent to {form.beneficiaryName}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStep('form'); setForm({ fromAccount: '0123456789', toAccount: '', beneficiaryName: '', amount: 0, narration: '' }); }} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">New Transfer</button>
          <button className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Download Receipt</button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Enter OTP</h1>
        <p className="text-sm text-muted-foreground">An OTP has been sent to your registered phone number</p>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="Enter 6-digit OTP" className="w-full px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-widest" />
        <button onClick={() => setStep('success')} disabled={otp.length < 6} className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          Confirm Transfer
        </button>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Review Transfer</h1>
        <div className="rounded-lg border bg-card divide-y">
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">From</span><span className="text-sm font-mono">{form.fromAccount}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">To</span><span className="text-sm font-mono">{form.toAccount}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Beneficiary</span><span className="text-sm">{form.beneficiaryName}</span></div>
          <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-mono font-bold">{formatMoney(form.amount, 'NGN')}</span></div>
          {form.narration && <div className="px-5 py-3 flex justify-between"><span className="text-sm text-muted-foreground">Narration</span><span className="text-sm">{form.narration}</span></div>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('form')} className="flex-1 px-4 py-2.5 border rounded-lg text-sm hover:bg-muted">Edit</button>
          <button onClick={() => setStep('otp')} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Proceed</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Transfer Money</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">From Account</label>
          <select value={form.fromAccount} onChange={(e) => update('fromAccount', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm">
            <option value="0123456789">Savings - 0123456789 (₦2,450,000)</option>
            <option value="0987654321">Current - 0987654321 (₦890,000)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To Account</label>
          <input value={form.toAccount} onChange={(e) => update('toAccount', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="Account number" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Name</label>
          <input value={form.beneficiaryName} onChange={(e) => update('beneficiaryName', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="Account holder name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
          <MoneyInput value={form.amount} onChange={(v) => update('amount', v)} currency="NGN" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Narration (optional)</label>
          <input value={form.narration} onChange={(e) => update('narration', e.target.value)} className="w-full px-3 py-2.5 border rounded-lg text-sm" placeholder="Payment description" />
        </div>
        <button onClick={() => setStep('review')} disabled={!form.toAccount || !form.amount} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          Continue
        </button>
      </div>
    </div>
  );
}
