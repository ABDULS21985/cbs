import { formatMoney, formatDate } from '@/lib/formatters';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface Props {
  state: LoanApplicationState;
  onNext: () => void;
  onBack: () => void;
}

// Generate mock schedule for preview
function generateSchedule(amount: number, rate: number, tenor: number): { items: any[]; totalInterest: number; totalRepayment: number } {
  const monthlyRate = rate / 100 / 12;
  const emi = monthlyRate > 0 ? (amount * monthlyRate * Math.pow(1 + monthlyRate, tenor)) / (Math.pow(1 + monthlyRate, tenor) - 1) : amount / tenor;
  let balance = amount;
  let totalInterest = 0;
  const items = [];
  const today = new Date();

  for (let i = 1; i <= tenor; i++) {
    const interest = balance * monthlyRate;
    const principal = emi - interest;
    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    const dueDate = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
    items.push({ installmentNumber: i, dueDate: dueDate.toISOString(), principalDue: principal, interestDue: interest, totalDue: emi, outstanding: balance });
  }
  return { items, totalInterest, totalRepayment: amount + totalInterest };
}

export function SchedulePreviewStep({ state, onNext, onBack }: Props) {
  const { items, totalInterest, totalRepayment } = generateSchedule(state.amount, state.interestRate, state.tenorMonths);
  const displayItems = items.slice(0, 12); // Show first 12, indicate more

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Repayment Schedule Preview</h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Principal</div><div className="text-lg font-semibold font-mono mt-1">{formatMoney(state.amount)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Total Interest</div><div className="text-lg font-semibold font-mono mt-1">{formatMoney(totalInterest)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Total Repayment</div><div className="text-lg font-semibold font-mono mt-1 text-primary">{formatMoney(totalRepayment)}</div></div>
      </div>

      {/* Schedule table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="px-4 py-2.5 text-left">#</th>
              <th className="px-4 py-2.5 text-left">Due Date</th>
              <th className="px-4 py-2.5 text-right">Principal</th>
              <th className="px-4 py-2.5 text-right">Interest</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr key={item.installmentNumber}>
                <td className="px-4 text-sm">{item.installmentNumber}</td>
                <td className="px-4 text-sm">{formatDate(item.dueDate)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.principalDue)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.interestDue)}</td>
                <td className="px-4 text-sm font-mono text-right font-medium">{formatMoney(item.totalDue)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.outstanding)}</td>
              </tr>
            ))}
            {items.length > 12 && (
              <tr><td colSpan={6} className="px-4 py-2 text-center text-sm text-muted-foreground">... and {items.length - 12} more installments</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Continue</button>
      </div>
    </div>
  );
}
