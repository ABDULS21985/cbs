import type { GoalTransaction } from '../../api/goalApi';

interface Props {
  contributions: GoalTransaction[];
}

export function AutoDebitSuccessRate({ contributions }: Props) {
  const deposits = contributions.filter((c) => c.transactionType === 'DEPOSIT');
  const total = deposits.length || 1;
  const successful = deposits.filter((c) => c.amount > 0).length;
  const rate = Math.round((successful / total) * 100);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 90 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{rate}%</span>
          <span className="text-[8px] text-muted-foreground">Success</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="font-mono font-medium">{successful}</span> <span className="text-muted-foreground">successful deposits</span></p>
        <p><span className="font-mono font-medium">{contributions.filter(c => c.transactionType === 'WITHDRAWAL').length}</span> <span className="text-muted-foreground">withdrawals</span></p>
        <p><span className="font-mono font-medium">{contributions.length}</span> <span className="text-muted-foreground">total transactions</span></p>
      </div>
    </div>
  );
}
