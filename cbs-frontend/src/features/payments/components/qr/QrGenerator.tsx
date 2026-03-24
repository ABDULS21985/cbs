import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, QrCode } from 'lucide-react';
import { MoneyInput } from '@/components/shared';
import { cn } from '@/lib/utils';
import { qrApi, type QrCode as QrCodeType } from '../../api/qrApi';

interface QrGeneratorProps {
  onGenerated: (qr: QrCodeType) => void;
}

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

export function QrGenerator({ onGenerated }: QrGeneratorProps) {
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amountType, setAmountType] = useState<'dynamic' | 'fixed'>('dynamic');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!accountNumber.trim()) next.accountNumber = 'Account number is required';
    else if (!/^\d{10}$/.test(accountNumber.trim())) next.accountNumber = 'Must be a 10-digit account number';
    if (!accountName.trim()) next.accountName = 'Account name is required';
    if (amountType === 'fixed' && amount <= 0) next.amount = 'Enter a valid amount';
    return next;
  };

  const handleGenerate = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsGenerating(true);
    try {
      const result = await qrApi.generateQr({
        accountId: accountNumber,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        amount: amountType === 'fixed' ? amount : undefined,
        currency,
      });
      const qr: QrCodeType = {
        qrId: result.qrId,
        qrData: result.qrData,
        expiresAt: result.expiresAt,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        amount: amountType === 'fixed' ? amount : undefined,
        currency,
      };
      onGenerated(qr);
      toast.success('QR code generated successfully');
    } catch {
      toast.error('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="payment-panel h-full p-5">
      <div className="mb-5">
        <p className="payment-hero-kicker">Collection setup</p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">Generate QR Code</h3>
        <p className="mt-2 text-sm text-muted-foreground">Create a QR code for receiving payments.</p>
      </div>

      <div className="payment-step-chip-row mt-0">
        <span className="payment-step-chip">10-digit settlement account</span>
        <span className="payment-step-chip">{amountType === 'fixed' ? 'Fixed amount' : 'Dynamic amount'}</span>
        <span className="payment-step-chip">{currency}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Number</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value.replace(/\D/g, ''));
              setErrors((p) => ({ ...p, accountNumber: '' }));
            }}
            placeholder="0000000000"
            className="payment-command-input font-mono"
          />
          {errors.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.accountNumber}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Account Name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => {
              setAccountName(e.target.value);
              setErrors((p) => ({ ...p, accountName: '' }));
            }}
            placeholder="Enter account holder name"
            className="payment-command-input"
          />
          {errors.accountName && <p className="text-xs text-red-500 mt-1">{errors.accountName}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountType('dynamic')}
              className={cn(
                'payment-selection-card flex-1 px-3 py-3 text-center text-sm font-medium',
                amountType === 'dynamic' && 'border-primary/40 bg-primary/10 text-primary shadow-none',
              )}
            >
              Dynamic (any amount)
            </button>
            <button
              type="button"
              onClick={() => setAmountType('fixed')}
              className={cn(
                'payment-selection-card flex-1 px-3 py-3 text-center text-sm font-medium',
                amountType === 'fixed' && 'border-primary/40 bg-primary/10 text-primary shadow-none',
              )}
            >
              Fixed amount
            </button>
          </div>
        </div>

        {amountType === 'fixed' && (
          <MoneyInput
            label="Amount"
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setErrors((p) => ({ ...p, amount: '' }));
            }}
            currency={currency}
            min={1}
            error={errors.amount}
          />
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="payment-command-input"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <QrCode className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate QR Code'}
        </button>
      </div>
    </div>
  );
}
