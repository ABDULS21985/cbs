import { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFeeLink } from '../../api/productApi';

interface AvailableFee {
  id: string;
  code: string;
  name: string;
  amount: number;
  occurrence: ProductFeeLink['occurrence'];
}

const AVAILABLE_FEES: AvailableFee[] = [
  { id: 'fee-001', code: 'ACC-MAINT-001', name: 'Monthly Account Maintenance', amount: 500, occurrence: 'MONTHLY' },
  { id: 'fee-009', code: 'SMS-ALERT-001', name: 'SMS Alert Subscription', amount: 100, occurrence: 'MONTHLY' },
  { id: 'fee-003', code: 'CARD-ISS-001', name: 'Debit Card Issuance', amount: 1000, occurrence: 'ONE_TIME' },
  { id: 'fee-008', code: 'CARD-MAINT-001', name: 'Annual Card Maintenance', amount: 1200, occurrence: 'ANNUAL' },
  { id: 'fee-002', code: 'TXN-XFER-001', name: 'Interbank Transfer Fee', amount: 500, occurrence: 'PER_TRANSACTION' },
  { id: 'fee-006', code: 'TXN-ATM-001', name: 'ATM Withdrawal (Off-us)', amount: 65, occurrence: 'PER_TRANSACTION' },
  { id: 'fee-004', code: 'LOAN-PROC-001', name: 'Loan Processing Fee', amount: 15000, occurrence: 'ONE_TIME' },
  { id: 'fee-005', code: 'ACC-MAINT-CURR', name: 'Current Account Quarterly Maintenance', amount: 2000, occurrence: 'MONTHLY' },
];

function occurrenceLabel(o: ProductFeeLink['occurrence']): string {
  const labels: Record<ProductFeeLink['occurrence'], string> = {
    PER_TRANSACTION: 'Per Txn',
    MONTHLY: '/mo',
    ANNUAL: '/yr',
    ONE_TIME: 'one-time',
  };
  return labels[o];
}


interface FeeLinkageStepProps {
  linkedFees: ProductFeeLink[];
  onChange: (fees: ProductFeeLink[]) => void;
}

export function FeeLinkageStep({ linkedFees, onChange }: FeeLinkageStepProps) {
  const [search, setSearch] = useState('');

  const linkedIds = new Set(linkedFees.map((f) => f.feeId));

  const filteredAvailable = AVAILABLE_FEES.filter(
    (f) =>
      !linkedIds.has(f.id) &&
      (search === '' || f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase())),
  );

  const linkFee = (fee: AvailableFee) => {
    const newLink: ProductFeeLink = {
      feeId: fee.id,
      feeName: fee.name,
      feeCode: fee.code,
      mandatory: false,
      waiverAuthority: 'OFFICER',
      occurrence: fee.occurrence,
      amount: fee.amount,
    };
    onChange([...linkedFees, newLink]);
  };

  const removeFee = (feeId: string) => {
    onChange(linkedFees.filter((f) => f.feeId !== feeId));
  };

  const updateLinked = (feeId: string, field: keyof ProductFeeLink, value: unknown) => {
    onChange(linkedFees.map((f) => (f.feeId === feeId ? { ...f, [field]: value } : f)));
  };

  const selectCls =
    'w-full px-2 py-1.5 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring';

  // Build fee bundle preview text
  const mandatoryFees = linkedFees.filter((f) => f.mandatory);
  const optionalFees = linkedFees.filter((f) => !f.mandatory);
  const bundleText = () => {
    const parts: string[] = [];
    mandatoryFees.forEach((f) => parts.push(`${f.feeName} (₦${f.amount.toLocaleString()}${occurrenceLabel(f.occurrence)})`));
    if (parts.length === 0 && optionalFees.length === 0) return 'No fees linked to this product.';
    const mandatory = parts.length > 0 ? `Mandatory: ${parts.join(', ')}` : '';
    const optional =
      optionalFees.length > 0
        ? `Optional: ${optionalFees.map((f) => f.feeName).join(', ')}`
        : '';
    return [mandatory, optional].filter(Boolean).join(' — ');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel: Available Fees */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold">Available Fees</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click "+ Link" to attach a fee to this product</p>
          </div>
          <div className="px-3 py-2 border-b border-border">
            <input
              type="text"
              placeholder="Search fees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto max-h-64">
            {filteredAvailable.length === 0 && (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                {linkedIds.size === AVAILABLE_FEES.length ? 'All available fees are linked.' : 'No fees match your search.'}
              </p>
            )}
            {filteredAvailable.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fee.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{fee.code}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    ₦{fee.amount.toLocaleString()}{occurrenceLabel(fee.occurrence)}
                  </span>
                  <button
                    type="button"
                    onClick={() => linkFee(fee)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Linked Fees */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold">Linked Fees</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{linkedFees.length} fee{linkedFees.length !== 1 ? 's' : ''} linked</p>
          </div>
          <div className="flex-1 divide-y divide-border overflow-y-auto max-h-72">
            {linkedFees.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No fees linked yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Link fees from the left panel.</p>
              </div>
            )}
            {linkedFees.map((fee) => (
              <div key={fee.feeId} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{fee.feeName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{fee.feeCode} · ₦{fee.amount.toLocaleString()}{occurrenceLabel(fee.occurrence)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFee(fee.feeId)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Mandatory toggle */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Mandatory</label>
                    <button
                      type="button"
                      onClick={() => updateLinked(fee.feeId, 'mandatory', !fee.mandatory)}
                      className={cn(
                        'w-full py-1 rounded text-xs font-medium transition-colors border',
                        fee.mandatory
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200',
                      )}
                    >
                      {fee.mandatory ? 'Yes' : 'No'}
                    </button>
                  </div>

                  {/* Waiver Authority */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Waiver Auth</label>
                    <select
                      value={fee.waiverAuthority}
                      onChange={(e) => updateLinked(fee.feeId, 'waiverAuthority', e.target.value)}
                      className={selectCls}
                    >
                      <option value="OFFICER">Officer</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  {/* Occurrence */}
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Occurrence</label>
                    <select
                      value={fee.occurrence}
                      onChange={(e) => updateLinked(fee.feeId, 'occurrence', e.target.value)}
                      className={selectCls}
                    >
                      <option value="PER_TRANSACTION">Per Txn</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="ANNUAL">Annual</option>
                      <option value="ONE_TIME">One-time</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Bundle Preview */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Customer Fee Preview
            </p>
            <p className="text-sm text-foreground">{bundleText()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
