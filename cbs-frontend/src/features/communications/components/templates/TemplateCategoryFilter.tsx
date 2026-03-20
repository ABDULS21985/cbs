import { cn } from '@/lib/utils';

const CATEGORIES = ['All', 'ACCOUNT', 'TRANSACTION', 'SECURITY', 'MARKETING', 'PRODUCT', 'COMPLIANCE'] as const;

interface TemplateCategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function TemplateCategoryFilter({ value, onChange }: TemplateCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat === 'All' ? '' : cat)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            (cat === 'All' && !value) || value === cat
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
