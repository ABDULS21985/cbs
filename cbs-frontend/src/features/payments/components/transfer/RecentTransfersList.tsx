import { RefreshCw } from 'lucide-react';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { useRecentTransfers } from '../../hooks/useTransfer';

interface Props {
  onRepeat: (transfer: { beneficiaryAccount: string; beneficiaryName: string; bankName: string; amount: number }) => void;
}

export function RecentTransfersList({ onRepeat }: Props) {
  const { data: recent = [] } = useRecentTransfers();

  if (!recent.length) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-2.5 border-b">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Transfers</h4>
      </div>
      <div className="divide-y">
        {recent.slice(0, 5).map((tx) => (
          <button
            key={tx.id}
            type="button"
            onClick={() => onRepeat({ beneficiaryAccount: tx.beneficiaryAccount, beneficiaryName: tx.beneficiaryName, bankName: tx.bankName, amount: tx.amount })}
            className="w-full text-left px-4 py-2.5 hover:bg-muted/50 flex items-center justify-between"
          >
            <div>
              <p className="text-sm">{tx.beneficiaryName}</p>
              <p className="text-xs text-muted-foreground">{tx.beneficiaryAccount} · {formatRelative(tx.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{formatMoney(tx.amount, tx.currency)}</span>
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
