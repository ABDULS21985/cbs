import { Zap, Tv, Smartphone, Globe, GraduationCap, Heart, Landmark, Droplets, Shield, Wrench } from 'lucide-react';
import type { BillerCategory } from '../../api/billPaymentApi';

const categoryIcons: Record<string, any> = {
  electricity: Zap, cable_tv: Tv, airtime: Smartphone, internet: Globe, school_fees: GraduationCap,
  health: Heart, government: Landmark, water: Droplets, insurance: Shield, other: Wrench,
};

const categoryColors: Record<string, string> = {
  electricity: 'bg-amber-100 text-amber-600', cable_tv: 'bg-purple-100 text-purple-600',
  airtime: 'bg-blue-100 text-blue-600', internet: 'bg-cyan-100 text-cyan-600',
  school_fees: 'bg-green-100 text-green-600', health: 'bg-red-100 text-red-600',
  government: 'bg-gray-100 text-gray-600', water: 'bg-sky-100 text-sky-600',
  insurance: 'bg-indigo-100 text-indigo-600', other: 'bg-gray-100 text-gray-600',
};

interface Props {
  categories: BillerCategory[];
  onSelect: (category: BillerCategory) => void;
}

export function BillerCategoryGrid({ categories, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {categories.map((cat) => {
        const Icon = categoryIcons[cat.code.toLowerCase()] || Wrench;
        const color = categoryColors[cat.code.toLowerCase()] || 'bg-gray-100 text-gray-600';
        return (
          <button
            key={cat.code}
            onClick={() => onSelect(cat)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-center">{cat.name}</span>
            <span className="text-xs text-muted-foreground">{cat.billerCount} billers</span>
          </button>
        );
      })}
    </div>
  );
}
