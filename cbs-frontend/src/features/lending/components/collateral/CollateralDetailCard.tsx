import { InfoGrid } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import type { Collateral } from '../../types/collateral';

interface CollateralDetailCardProps {
  collateral: Collateral;
}

export function CollateralDetailCard({ collateral }: CollateralDetailCardProps) {
  return (
    <div className="surface-card shadow-sm divide-y">
      {/* Basic Info */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Basic Information
        </h3>
        <InfoGrid
          columns={2}
          items={[
            { label: 'Collateral Number', value: collateral.collateralNumber, copyable: true, mono: true },
            { label: 'Type', value: collateral.type.replace(/_/g, ' ') },
            { label: 'Description', value: collateral.description, span: 2 },
            { label: 'Owner', value: collateral.owner },
            ...(collateral.location ? [{ label: 'Location', value: collateral.location }] : []),
            ...(collateral.registrationRef
              ? [{ label: 'Registration Ref', value: collateral.registrationRef, copyable: true, mono: true }]
              : []),
          ]}
        />
      </div>

      {/* Valuation */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Valuation
        </h3>
        <InfoGrid
          columns={2}
          items={[
            { label: 'Current Value', value: collateral.currentValue, format: 'money', currency: collateral.currency },
            { label: 'Adjusted Value', value: collateral.adjustedValue, format: 'money', currency: collateral.currency },
            { label: 'Haircut', value: collateral.haircut, format: 'percent' },
            { label: 'Valuation Date', value: collateral.valuationDate, format: 'date' },
            ...(collateral.valuer ? [{ label: 'Valuer', value: collateral.valuer }] : []),
          ]}
        />
      </div>

      {/* Insurance */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Insurance
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
            <StatusBadge status={collateral.insuranceStatus} />
          </div>
          <InfoGrid
            columns={2}
            items={[
              ...(collateral.insuranceProvider
                ? [{ label: 'Provider', value: collateral.insuranceProvider }]
                : []),
              ...(collateral.insurancePolicyNumber
                ? [{ label: 'Policy #', value: collateral.insurancePolicyNumber, mono: true, copyable: true }]
                : []),
              ...(collateral.insuranceExpiry
                ? [{ label: 'Expiry Date', value: formatDate(collateral.insuranceExpiry) }]
                : []),
            ]}
          />
          {!collateral.insuranceProvider && !collateral.insurancePolicyNumber && (
            <p className="text-sm text-muted-foreground">No insurance details on record.</p>
          )}
        </div>
      </div>

      {/* Perfection Status */}
      <div className="p-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Legal Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Perfection Status
            </span>
            <StatusBadge status={collateral.perfectionStatus} />
          </div>
          {collateral.filingReference && (
            <InfoGrid
              columns={2}
              items={[{ label: 'Filing Reference', value: collateral.filingReference, mono: true, copyable: true }]}
            />
          )}
        </div>
      </div>

      {/* Linked Loans */}
      {collateral.linkedLoans.length > 0 && (
        <div className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Linked Loans
          </h3>
          <div className="space-y-2">
            {collateral.linkedLoans.map((loan) => (
              <div key={loan.loanNumber} className="flex items-center justify-between text-sm">
                <span className="font-mono font-medium">{loan.loanNumber}</span>
                <span className="font-mono text-muted-foreground">
                  Outstanding: {loan.outstanding.toLocaleString('en-NG', { style: 'currency', currency: collateral.currency })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
