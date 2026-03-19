import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { LeaseContract, AmortizationRow } from '../../types/lease';

interface Ifrs16PanelProps {
  lease: LeaseContract;
  amortization?: AmortizationRow[];
}

export function Ifrs16Panel({ lease, amortization = [] }: Ifrs16PanelProps) {
  const [expanded, setExpanded] = useState(false);

  const totalMonths = Math.round(
    (new Date(lease.endDate).getTime() - new Date(lease.commencementDate).getTime()) /
    (1000 * 60 * 60 * 24 * 30.44)
  );

  const previewRows = expanded ? amortization.slice(0, 12) : amortization.slice(0, 6);

  return (
    <div className="bg-card border rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">IFRS 16 Summary</h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">ROU Asset</p>
          <p className="text-sm font-bold font-mono mt-0.5">{formatMoney(lease.rouAsset, lease.currency)}</p>
          <p className="text-xs text-muted-foreground">Net of depreciation</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Lease Liability</p>
          <p className="text-sm font-bold font-mono mt-0.5">{formatMoney(lease.leaseLiability, lease.currency)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Depreciation</p>
          <p className="text-sm font-bold font-mono mt-0.5">{formatMoney(lease.monthlyDepreciation, lease.currency)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Lease Term</p>
          <p className="text-sm font-bold mt-0.5">{lease.remainingMonths} / {totalMonths} months</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, ((totalMonths - lease.remainingMonths) / totalMonths) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Commencement: <span className="text-foreground">{formatDate(lease.commencementDate)}</span></p>
        <p className="text-xs text-muted-foreground">End Date: <span className="text-foreground">{formatDate(lease.endDate)}</span></p>
      </div>

      {/* Mini amortization table */}
      {amortization.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Amortization Schedule
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">Mo.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Payment</th>
                  <th className="px-2 py-1.5 text-right font-medium">Interest</th>
                  <th className="px-2 py-1.5 text-right font-medium">Principal</th>
                  <th className="px-2 py-1.5 text-right font-medium">Closing Liab.</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.month} className="border-t hover:bg-muted/20">
                    <td className="px-2 py-1">{row.month}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatMoney(row.payment)}</td>
                    <td className="px-2 py-1 text-right font-mono text-amber-600">{formatMoney(row.interestCharge)}</td>
                    <td className="px-2 py-1 text-right font-mono text-green-600">{formatMoney(row.principalRepayment)}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatMoney(row.closingLiability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {amortization.length > 6 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Show less' : `View all ${amortization.length} rows`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
