import { formatMoney } from '@/lib/formatters';
import type { InternationalCharges } from '../../api/internationalPaymentApi';

interface Props {
  charges: InternationalCharges | null;
  localCurrency: string;
}

export function ChargesBreakdown({ charges, localCurrency }: Props) {
  if (!charges) return null;

  return (
    <div className="p-4 border rounded-md bg-muted/30 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Charges Breakdown</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Transfer Fee</span><span className="font-mono">{formatMoney(charges.transferFee, localCurrency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">SWIFT Charge</span><span className="font-mono">{formatMoney(charges.swiftCharge, localCurrency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Correspondent Fee (est)</span><span className="font-mono">{formatMoney(charges.correspondentFee, charges.correspondentFeeCurrency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Regulatory Levy</span><span className="font-mono">{formatMoney(charges.regulatoryLevy, localCurrency)}</span></div>
        <hr className="my-1" />
        <div className="flex justify-between font-semibold"><span>Total Charges</span><span className="font-mono">{formatMoney(charges.totalChargesLocal, localCurrency)}{charges.totalChargesForeign > 0 ? ` + ${formatMoney(charges.totalChargesForeign, charges.totalChargesForeignCurrency)}` : ''}</span></div>
      </div>
    </div>
  );
}
