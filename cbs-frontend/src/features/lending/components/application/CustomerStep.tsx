import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import { Search, Check, X, AlertTriangle, Loader2, User } from 'lucide-react';
import { apiGet } from '@/lib/api';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface CustomerStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface CustomerSnapshot {
  id: number;
  customerNumber: string;
  fullName: string;
  type: string;
  segment?: string;
  riskRating?: string;
  kycStatus: string;
  status: string;
}

interface ExistingLoan {
  loanNumber: string;
  productName: string;
  outstandingPrincipal: number;
  daysPastDue: number;
  status: string;
}

function EligibilityCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
      <span className={cn('text-sm', passed ? '' : 'text-red-600 font-medium')}>{label}</span>
    </div>
  );
}

export function CustomerStep({ state, updateField, onNext, onBack }: CustomerStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['customers', 'search', searchQuery],
    queryFn: () => apiGet<CustomerSnapshot[]>('/api/v1/customers', { search: searchQuery, page: 0, size: 10 } as Record<string, unknown>),
    enabled: searchQuery.length >= 2,
    staleTime: 15_000,
  });

  const { data: customer } = useQuery({
    queryKey: ['customers', 'detail', state.customerId],
    queryFn: () => apiGet<CustomerSnapshot>(`/api/v1/customers/${state.customerId}`),
    enabled: !!state.customerId,
  });

  const { data: existingLoans = [] } = useQuery({
    queryKey: ['loans', 'customer', state.customerId],
    queryFn: () => apiGet<ExistingLoan[]>(`/api/v1/loans/customer/${state.customerId}`),
    enabled: !!state.customerId,
  });

  const selectCustomer = (c: CustomerSnapshot) => {
    updateField('customerId', c.id);
    updateField('customerName', c.fullName);
    setSearchQuery('');
  };

  useEffect(() => {
    if (customer?.fullName && state.customerName !== customer.fullName) {
      updateField('customerName', customer.fullName);
    }
  }, [customer?.fullName, state.customerName, updateField]);

  const kycVerified = customer?.kycStatus === 'VERIFIED';
  const notBlacklisted = customer?.status !== 'BLACKLISTED' && customer?.status !== 'SUSPENDED';
  const totalOutstanding = existingLoans.reduce((s, l) => s + l.outstandingPrincipal, 0);
  const dtiOk = state.monthlyIncome > 0 ? (totalOutstanding / state.monthlyIncome) < 0.5 : true;
  const allEligible = kycVerified && notBlacklisted && (state.customerId ? dtiOk : true);

  return (
    <div className="surface-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Customer Selection</h3>
        <p className="text-sm text-muted-foreground">Search and verify the borrower</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or CIF number..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}

        {searchResults.length > 0 && searchQuery.length >= 2 && (
          <div className="absolute z-10 w-full mt-1 surface-card shadow-lg max-h-60 overflow-auto">
            {searchResults.map((c) => (
              <button key={c.id} onClick={() => selectCustomer(c)} className="w-full px-4 py-3 text-left hover:bg-muted/50 border-b last:border-0">
                <p className="text-sm font-medium">{c.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.customerNumber} — {c.type}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer Snapshot */}
      {customer && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{customer.fullName}</p>
              <p className="text-xs text-muted-foreground font-mono">{customer.customerNumber}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <StatusBadge status={customer.status} dot />
              {customer.riskRating && <StatusBadge status={customer.riskRating} />}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{customer.type}</p></div>
            <div><p className="text-xs text-muted-foreground">Segment</p><p className="font-medium">{customer.segment || '--'}</p></div>
            <div><p className="text-xs text-muted-foreground">KYC</p><StatusBadge status={customer.kycStatus} dot /></div>
            <div><p className="text-xs text-muted-foreground">Existing Loans</p><p className="font-medium">{existingLoans.length}</p></div>
          </div>
        </div>
      )}

      {/* Eligibility Checks */}
      {state.customerId && customer && (
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-semibold mb-2">Eligibility Checks</p>
          <EligibilityCheck label="KYC verified" passed={kycVerified} />
          <EligibilityCheck label="Debt-to-income within limits" passed={dtiOk} />
          <EligibilityCheck label="No blacklisted status" passed={notBlacklisted} />
        </div>
      )}

      {/* Existing Loans */}
      {existingLoans.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b"><p className="text-xs font-semibold">Existing Loans ({existingLoans.length})</p></div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20"><tr>
              <th className="px-4 py-2 text-left text-xs">Loan #</th>
              <th className="px-4 py-2 text-left text-xs">Product</th>
              <th className="px-4 py-2 text-right text-xs">Outstanding</th>
              <th className="px-4 py-2 text-right text-xs">DPD</th>
              <th className="px-4 py-2 text-left text-xs">Status</th>
            </tr></thead>
            <tbody className="divide-y">{existingLoans.map((l) => (
              <tr key={l.loanNumber} className="hover:bg-muted/20">
                <td className="px-4 py-2 font-mono text-xs">{l.loanNumber}</td>
                <td className="px-4 py-2 text-xs">{l.productName}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(l.outstandingPrincipal)}</td>
                <td className={cn('px-4 py-2 text-right tabular-nums', l.daysPastDue > 0 && 'text-red-600')}>{l.daysPastDue}</td>
                <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!state.customerId || !allEligible} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          Continue
        </button>
      </div>
    </div>
  );
}
