import { Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { useFeePreview } from '../../hooks/useTransfer';

interface Props {
  amount: number;
  transferType: string;
  currency?: string;
}

export function FeePreview({ amount, transferType, currency = 'NGN' }: Props) {
  const { data: fees, isLoading } = useFeePreview(amount, transferType, currency);

  if (!amount || !transferType) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Calculating fees...
      </div>
    );
  }

  if (!fees) return null;

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fee Breakdown</h4>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Transfer Fee</span>
          <span className="font-mono">{formatMoney(fees.transferFee, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT</span>
          <span className="font-mono">{formatMoney(fees.vat, currency)}</span>
        </div>
        <hr className="my-1" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total Debit</span>
          <span className="font-mono">{formatMoney(fees.totalDebit, currency)}</span>
        </div>
      </div>
    </div>
  );
}
