import { formatMoney } from '@/lib/formatters';
import type { InternationalCharges } from '../../api/internationalPaymentApi';

interface Props {
  charges: InternationalCharges | null;
  localCurrency: string;
}

export function ChargesBreakdown({ charges, localCurrency }: Props) {
  if (!charges) {
    return (
      <div className="p-4 border rounded-xl bg-card">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Charges Breakdown</h4>
        <p className="text-sm text-muted-foreground italic">Charges will be calculated after amount entry</p>
      </div>
    );
  }

  const chargeItems = [
    { label: 'Transfer Fee', amount: charges.transferFee, currency: localCurrency },
    { label: 'SWIFT Charge', amount: charges.swiftCharge, currency: localCurrency },
    { label: 'Correspondent Fee (est)', amount: charges.correspondentFee, currency: charges.correspondentFeeCurrency },
    { label: 'Regulatory Levy', amount: charges.regulatoryLevy, currency: localCurrency },
  ];

  return (
    <div className="p-4 border rounded-xl bg-card space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Charges Breakdown</h4>
      <div className="space-y-2 text-sm">
        {chargeItems.map((item) => (
          <div key={item.label} className="flex justify-between">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-mono">{formatMoney(item.amount, item.currency)}</span>
          </div>
        ))}
        <hr className="border-border" />
        <div className="flex justify-between font-bold text-primary">
          <span>Total Charges</span>
          <span className="font-mono">
            {formatMoney(charges.totalChargesLocal, localCurrency)}
            {charges.totalChargesForeign > 0 && ` + ${formatMoney(charges.totalChargesForeign, charges.totalChargesForeignCurrency)}`}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Charges may vary based on correspondent bank fees</p>
    </div>
  );
}
