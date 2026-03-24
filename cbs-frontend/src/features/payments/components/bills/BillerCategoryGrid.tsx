import type { LucideIcon } from 'lucide-react';
import {
  Droplets,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Shield,
  Smartphone,
  Tv,
  Wrench,
  Zap,
} from 'lucide-react';

import type { BillerCategory } from '../../api/billPaymentApi';

const categoryIcons: Record<string, LucideIcon> = {
  electricity: Zap,
  cable_tv: Tv,
  airtime: Smartphone,
  internet: Globe,
  school_fees: GraduationCap,
  health: Heart,
  government: Landmark,
  water: Droplets,
  insurance: Shield,
  other: Wrench,
};

const categoryColors: Record<string, string> = {
  electricity: 'bg-amber-100 text-amber-600',
  cable_tv: 'bg-violet-100 text-violet-600',
  airtime: 'bg-blue-100 text-blue-600',
  internet: 'bg-cyan-100 text-cyan-600',
  school_fees: 'bg-emerald-100 text-emerald-600',
  health: 'bg-rose-100 text-rose-600',
  government: 'bg-slate-100 text-slate-600',
  water: 'bg-sky-100 text-sky-600',
  insurance: 'bg-indigo-100 text-indigo-600',
  other: 'bg-slate-100 text-slate-600',
};

interface Props {
  categories: BillerCategory[];
  onSelect: (category: BillerCategory) => void;
}

export function BillerCategoryGrid({ categories, onSelect }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => {
        const Icon = categoryIcons[category.code.toLowerCase()] || Wrench;
        const color = categoryColors[category.code.toLowerCase()] || 'bg-slate-100 text-slate-600';

        return (
          <button
            key={category.code}
            onClick={() => onSelect(category)}
            className="payment-selection-card group"
          >
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[1rem] ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold text-foreground">{category.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {category.billerCount} billers ready for payment
            </p>
          </button>
        );
      })}
    </div>
  );
}
