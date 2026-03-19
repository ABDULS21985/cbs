import { useState, useMemo } from 'react';
import { formatMoney } from '@/lib/formatters';

interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function MortgageCalculator() {
  const [loanAmount, setLoanAmount] = useState(10_000_000);
  const [annualRate, setAnnualRate] = useState(15);
  const [tenorYears, setTenorYears] = useState(10);
  const [downPaymentPct, setDownPaymentPct] = useState(20);

  const calculation = useMemo(() => {
    const principal = loanAmount * (1 - downPaymentPct / 100);
    if (principal <= 0 || annualRate <= 0 || tenorYears <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalCost: 0, schedule: [] };
    }
    const monthlyRate = annualRate / 12 / 100;
    const months = tenorYears * 12;
    const factor = Math.pow(1 + monthlyRate, months);
    const monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
    const totalCost = monthlyPayment * months;
    const totalInterest = totalCost - principal;

    const schedule: AmortizationEntry[] = [];
    let balance = principal;
    for (let m = 1; m <= Math.min(12, months); m++) {
      const interest = balance * monthlyRate;
      const principalPaid = monthlyPayment - interest;
      balance -= principalPaid;
      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: principalPaid,
        interest,
        balance: Math.max(balance, 0),
      });
    }

    return { monthlyPayment, totalInterest, totalCost, schedule };
  }, [loanAmount, annualRate, tenorYears, downPaymentPct]);

  return (
    <div className="bg-card border rounded-lg p-5 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Mortgage Calculator</h3>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Property / Loan Amount (NGN)
          </label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
            min={0}
            step={100000}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Down Payment: {downPaymentPct}%
          </label>
          <input
            type="range"
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            min={0}
            max={50}
            step={5}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>0%</span><span>50%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Annual Interest Rate: {annualRate}%
          </label>
          <input
            type="range"
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
            min={5}
            max={30}
            step={0.5}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>5%</span><span>30%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Tenor: {tenorYears} years
          </label>
          <input
            type="range"
            value={tenorYears}
            onChange={(e) => setTenorYears(Number(e.target.value))}
            min={1}
            max={30}
            step={1}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>1yr</span><span>30yrs</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Payment</p>
          <p className="text-lg font-bold font-mono mt-1">{formatMoney(calculation.monthlyPayment)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Interest</p>
          <p className="text-lg font-bold font-mono mt-1 text-amber-700">{formatMoney(calculation.totalInterest)}</p>
        </div>
        <div className="bg-muted/40 border rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
          <p className="text-lg font-bold font-mono mt-1">{formatMoney(calculation.totalCost)}</p>
        </div>
      </div>

      {/* Amortization (first 12 months) */}
      {calculation.schedule.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">First 12 Months Amortization</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Month</th>
                  <th className="px-3 py-2 text-right font-medium">Payment</th>
                  <th className="px-3 py-2 text-right font-medium">Principal</th>
                  <th className="px-3 py-2 text-right font-medium">Interest</th>
                  <th className="px-3 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {calculation.schedule.map((row) => (
                  <tr key={row.month} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-1.5">{row.month}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatMoney(row.payment)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-600">{formatMoney(row.principal)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-amber-600">{formatMoney(row.interest)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatMoney(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
