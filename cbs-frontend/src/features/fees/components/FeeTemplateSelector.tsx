import { FileText, CreditCard, Landmark, ArrowRightLeft, Banknote, Smartphone, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeeDefinition } from '../api/feeApi';

interface FeeTemplate {
  name: string;
  icon: typeof FileText;
  emoji: string;
  description: string;
  data: Partial<FeeDefinition>;
}

const FEE_TEMPLATES: FeeTemplate[] = [
  {
    name: 'Card Issuance Fee',
    icon: CreditCard,
    emoji: '💳',
    description: '₦1,500 FLAT · PER_TRANSACTION · 7.5% VAT',
    data: {
      name: 'Card Issuance Fee',
      category: 'CARD',
      calcType: 'FLAT',
      flatAmount: 1500,
      vatApplicable: true,
      vatRate: 7.5,
      schedule: 'PER_TRANSACTION',
      waiverAuthority: 'MANAGER',
    },
  },
  {
    name: 'Account Maintenance',
    icon: Landmark,
    emoji: '🏦',
    description: '₦300 FLAT · MONTHLY · 7.5% VAT',
    data: {
      name: 'Account Maintenance Fee',
      category: 'ACCOUNT_MAINTENANCE',
      calcType: 'FLAT',
      flatAmount: 300,
      vatApplicable: true,
      vatRate: 7.5,
      schedule: 'MONTHLY',
      waiverAuthority: 'OFFICER',
    },
  },
  {
    name: 'Transfer Fee',
    icon: ArrowRightLeft,
    emoji: '💸',
    description: 'TIERED · PER_TRANSACTION · Standard tiers',
    data: {
      name: 'Transfer Fee',
      category: 'TRANSACTION',
      calcType: 'TIERED',
      tiers: [
        { fromAmount: 0, toAmount: 5000, rate: 0, flatFee: 10 },
        { fromAmount: 5001, toAmount: 50000, rate: 0, flatFee: 25 },
        { fromAmount: 50001, toAmount: 1000000, rate: 0, flatFee: 50 },
        { fromAmount: 1000001, toAmount: 999999999, rate: 0, flatFee: 100 },
      ],
      onAmount: 'DEBIT',
      vatApplicable: true,
      vatRate: 7.5,
      schedule: 'PER_TRANSACTION',
      waiverAuthority: 'MANAGER',
    },
  },
  {
    name: 'Loan Processing Fee',
    icon: Banknote,
    emoji: '📋',
    description: '1% · Min ₦5K · Max ₦50K',
    data: {
      name: 'Loan Processing Fee',
      category: 'LOAN',
      calcType: 'PERCENTAGE',
      percentage: 1,
      minFee: 5000,
      maxFee: 50000,
      onAmount: 'DEBIT',
      vatApplicable: true,
      vatRate: 7.5,
      schedule: 'PER_TRANSACTION',
      waiverAuthority: 'ADMIN',
    },
  },
  {
    name: 'ATM Withdrawal (Other Bank)',
    icon: Receipt,
    emoji: '🏧',
    description: '₦35 FLAT · PER_TRANSACTION',
    data: {
      name: 'ATM Withdrawal Fee (Other Bank)',
      category: 'TRANSACTION',
      calcType: 'FLAT',
      flatAmount: 35,
      vatApplicable: false,
      schedule: 'PER_TRANSACTION',
      waiverAuthority: 'OFFICER',
    },
  },
  {
    name: 'SMS Alert Fee',
    icon: Smartphone,
    emoji: '📱',
    description: '₦4 FLAT · MONTHLY',
    data: {
      name: 'SMS Alert Fee',
      category: 'ACCOUNT_MAINTENANCE',
      calcType: 'FLAT',
      flatAmount: 4,
      vatApplicable: false,
      schedule: 'MONTHLY',
      waiverAuthority: 'OFFICER',
    },
  },
];

interface FeeTemplateSelectorProps {
  onSelect: (data: Partial<FeeDefinition> | null) => void;
}

export function FeeTemplateSelector({ onSelect }: FeeTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Choose a Template</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Start with a pre-configured template or create from scratch</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* Blank template */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="p-4 border-2 border-dashed rounded-xl text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📄</span>
            <span className="text-sm font-semibold group-hover:text-primary">Blank</span>
          </div>
          <p className="text-xs text-muted-foreground">Start from scratch</p>
          <div className="mt-2 text-[10px] text-muted-foreground/60">₦0 · No VAT</div>
        </button>

        {/* Pre-built templates */}
        {FEE_TEMPLATES.map((template) => (
          <button
            key={template.name}
            type="button"
            onClick={() => onSelect(template.data)}
            className="p-4 border-2 rounded-xl text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{template.emoji}</span>
              <span className="text-sm font-semibold group-hover:text-primary">{template.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
