import { cn } from '@/lib/utils';

const COMMON_MCCS = [
  { code: '5411', description: 'Grocery Stores, Supermarkets' },
  { code: '5541', description: 'Service Stations' },
  { code: '5812', description: 'Eating Places, Restaurants' },
  { code: '5912', description: 'Drug Stores and Pharmacies' },
  { code: '5999', description: 'Miscellaneous Retail Stores' },
  { code: '7011', description: 'Hotels, Lodging' },
  { code: '4111', description: 'Transportation - Suburban' },
  { code: '5311', description: 'Department Stores' },
  { code: '5691', description: 'Clothing Stores' },
  { code: '5732', description: 'Electronics Stores' },
  { code: '5942', description: 'Book Stores' },
  { code: '8011', description: 'Doctors' },
  { code: '8021', description: 'Dentists, Orthodontists' },
  { code: '8062', description: 'Hospitals' },
  { code: '5944', description: 'Jewelry Stores' },
  { code: '7832', description: 'Motion Picture Theaters' },
  { code: '5511', description: 'Automobile Dealers' },
  { code: '7399', description: 'Business Services' },
  { code: '4814', description: 'Telecommunications' },
  { code: '6012', description: 'Financial Institutions' },
];

function suggestRiskCategory(mcc: string): string {
  const highRisk = ['5912', '5944', '7995', '5962', '5966', '5967'];
  const prohibited = ['7995'];
  if (prohibited.includes(mcc)) return 'PROHIBITED';
  if (highRisk.includes(mcc)) return 'HIGH';
  if (['6012', '4814', '7399'].includes(mcc)) return 'MEDIUM';
  return 'LOW';
}

interface MccSelectorProps {
  value: string;
  onChange: (code: string, description: string) => void;
  className?: string;
}

function MccSelector({ value, onChange, className }: MccSelectorProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-muted-foreground">MCC Code</label>
      <select
        value={value}
        onChange={(e) => {
          const mcc = COMMON_MCCS.find((m) => m.code === e.target.value);
          onChange(e.target.value, mcc?.description ?? '');
        }}
        className="w-full mt-1 input"
        required
      >
        <option value="">Select MCC...</option>
        {COMMON_MCCS.map((m) => (
          <option key={m.code} value={m.code}>
            {m.code} — {m.description}
          </option>
        ))}
      </select>
    </div>
  );
}

export { COMMON_MCCS, suggestRiskCategory, MccSelector };
