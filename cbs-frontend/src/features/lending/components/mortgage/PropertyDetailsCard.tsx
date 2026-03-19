import { InfoGrid } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { MortgageLoan } from '../../types/mortgage';

interface PropertyDetailsCardProps {
  loan: MortgageLoan;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  LAND: 'Land',
};

const insuranceBadgeColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'VALID') return 'bg-green-100 text-green-800';
  if (s === 'EXPIRING_SOON') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
};

export function PropertyDetailsCard({ loan }: PropertyDetailsCardProps) {
  return (
    <div className="bg-card border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Property Details</h3>
      <InfoGrid
        columns={2}
        items={[
          {
            label: 'Property Address',
            value: loan.propertyAddress,
            span: 2,
          },
          {
            label: 'Property Type',
            value: PROPERTY_TYPE_LABELS[loan.propertyType] ?? loan.propertyType,
          },
          {
            label: 'Property Size',
            value: loan.propertySize ?? '—',
          },
          {
            label: 'Title Reference',
            value: loan.propertyTitle,
            copyable: true,
          },
          {
            label: 'Current Valuation',
            value: loan.propertyValue,
            format: 'money',
            currency: loan.currency,
          },
          {
            label: 'Insurance Status',
            value: (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', insuranceBadgeColor(loan.insuranceStatus))}>
                {loan.insuranceStatus}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
