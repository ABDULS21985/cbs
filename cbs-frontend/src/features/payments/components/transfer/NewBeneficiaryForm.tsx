import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useNameEnquiry, useBanks } from '../../hooks/useTransfer';

interface Props {
  onVerified: (data: { accountNumber: string; bankCode: string; bankName: string; verifiedName: string }) => void;
}

export function NewBeneficiaryForm({ onVerified }: Props) {
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const { data: banks = [] } = useBanks();
  const nameEnquiry = useNameEnquiry();

  const handleVerify = () => {
    if (accountNumber.length >= 10 && bankCode) {
      nameEnquiry.mutate({ accountNumber, bankCode }, {
        onSuccess: (result) => {
          if (result.verified) {
            onVerified({
              accountNumber,
              bankCode,
              bankName: result.bankName,
              verifiedName: result.accountName,
            });
          }
        },
      });
    }
  };

  const selectedBank = banks.find((b) => b.code === bankCode);

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Account Number</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0123456789"
            className="w-full px-3 py-2 border rounded-md text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Bank</label>
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Select bank...</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>{bank.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={accountNumber.length < 10 || !bankCode || nameEnquiry.isPending}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {nameEnquiry.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Verify Name
      </button>

      {nameEnquiry.data?.verified && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">{nameEnquiry.data.accountName}</span>
        </div>
      )}

      {nameEnquiry.isError && (
        <p className="text-xs text-red-600">Name verification failed. Please check the details.</p>
      )}
    </div>
  );
}
