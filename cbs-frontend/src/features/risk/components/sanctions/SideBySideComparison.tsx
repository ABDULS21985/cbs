import { cn } from '@/lib/utils';
import type { SanctionsMatch } from '../../types/sanctions';

interface Props {
  match: SanctionsMatch;
}

interface FieldRow {
  label: string;
  fieldKey: string;
  customerValue?: string;
  entityValue?: string;
  isMatching: boolean;
}

export function SideBySideComparison({ match }: Props) {
  const matchingFields = match.matchingFields ?? [];

  const fields: FieldRow[] = [
    {
      label: 'Name',
      fieldKey: 'name',
      customerValue: match.customerName,
      entityValue: match.entityMatched,
      isMatching: matchingFields.includes('name') || match.matchType === 'NAME' || match.matchType === 'COMBINED',
    },
    {
      label: 'Date of Birth',
      fieldKey: 'dob',
      customerValue: match.customerDob,
      entityValue: match.entityDob,
      isMatching: matchingFields.includes('dob') || match.matchType === 'DOB' || match.matchType === 'COMBINED',
    },
    {
      label: 'Nationality',
      fieldKey: 'nationality',
      customerValue: match.customerNationality,
      entityValue: match.entityNationality,
      isMatching: matchingFields.includes('nationality'),
    },
    {
      label: 'Passport',
      fieldKey: 'passport',
      customerValue: match.customerPassport,
      entityValue: match.entityPassport,
      isMatching: matchingFields.includes('passport') || match.matchType === 'PASSPORT' || match.matchType === 'COMBINED',
    },
    {
      label: 'Address',
      fieldKey: 'address',
      customerValue: match.customerAddress,
      entityValue: match.entityAddress,
      isMatching: matchingFields.includes('address') || match.matchType === 'ADDRESS' || match.matchType === 'COMBINED',
    },
  ];

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-2 divide-x">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2.5 font-semibold text-sm text-blue-700 dark:text-blue-300">
          Our Customer
        </div>
        <div className="bg-orange-50/50 dark:bg-orange-900/10 px-4 py-2.5 font-semibold text-sm text-orange-700 dark:text-orange-300">
          Watchlist Entity
        </div>
      </div>
      <div className="divide-y">
        {fields.map((field) => (
          <div key={field.fieldKey} className={cn('grid grid-cols-2 divide-x', field.isMatching && 'bg-yellow-50/60 dark:bg-yellow-900/10')}>
            <div className="px-4 py-2.5">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-2">
                {field.label}
                {field.isMatching && (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 text-[10px] font-medium">
                    MATCH
                  </span>
                )}
              </div>
              <div className="text-sm font-medium">
                {field.customerValue ?? <span className="text-muted-foreground italic">N/A</span>}
              </div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-xs text-muted-foreground mb-0.5">{field.label}</div>
              <div className={cn('text-sm font-medium', !field.isMatching && field.entityValue && 'text-red-600 dark:text-red-400')}>
                {field.entityValue ?? <span className="text-muted-foreground italic">N/A</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Overall Match Score</span>
        <span className="text-sm font-bold">{match.matchScore}%</span>
      </div>
    </div>
  );
}
