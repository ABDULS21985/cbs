import { Search } from 'lucide-react';

interface Props {
  activeType: string;
  onTypeChange: (type: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

const TYPES = ['ALL', 'EQUITY', 'FIXED_INCOME', 'BALANCED', 'MONEY_MARKET', 'REAL_ESTATE', 'SHARIA'];

export function FundFilters({ activeType, onTypeChange, search, onSearchChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border overflow-hidden">
        {TYPES.map((t) => (
          <button key={t} onClick={() => onTypeChange(t)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeType === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {t === 'ALL' ? 'All' : t === 'FIXED_INCOME' ? 'Fixed Income' : t === 'MONEY_MARKET' ? 'Money Market' : t === 'REAL_ESTATE' ? 'Real Estate' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="w-full pl-9 input" placeholder="Search funds..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
      </div>
      <select value={sort} onChange={(e) => onSortChange(e.target.value)} className="input min-w-[140px]">
        <option value="aum">Sort: AUM</option>
        <option value="ytd">Sort: YTD Return</option>
        <option value="name">Sort: Name</option>
      </select>
    </div>
  );
}
