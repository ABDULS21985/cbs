import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, QrCode } from 'lucide-react';
import { FormSection, MoneyInput } from '@/components/shared';
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
    <FormSection title="Generate QR Code" description="Create a QR code for receiving payments">
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
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
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
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.accountName && <p className="text-xs text-red-500 mt-1">{errors.accountName}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountType('dynamic')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                amountType === 'dynamic'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              Dynamic (any amount)
            </button>
            <button
              type="button"
              onClick={() => setAmountType('fixed')}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                amountType === 'fixed'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted'
              }`}
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
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <QrCode className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate QR Code'}
        </button>
      </div>
    </FormSection>
  );
}
