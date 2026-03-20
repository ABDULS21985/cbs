import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface Props {
  onFilterChange: (filters: { type?: string; currency?: string; search?: string }) => void;
}

export function PortfolioFilters({ onFilterChange }: Props) {
  const [type, setType] = useState('');
  const [currency, setCurrency] = useState('');
  const [search, setSearch] = useState('');

  const update = (key: string, value: string) => {
    const next = { type, currency, search, [key]: value };
    if (key === 'type') setType(value);
    if (key === 'currency') setCurrency(value);
    if (key === 'search') setSearch(value);
    onFilterChange({ type: next.type || undefined, currency: next.currency || undefined, search: next.search || undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="w-full pl-9 input" placeholder="Search portfolios..." value={search} onChange={(e) => update('search', e.target.value)} />
      </div>
      <select value={type} onChange={(e) => update('type', e.target.value)} className="input min-w-[160px]">
        <option value="">All Types</option>
        <option value="DISCRETIONARY">Discretionary</option>
        <option value="ADVISORY">Advisory</option>
        <option value="EXECUTION_ONLY">Execution Only</option>
      </select>
      <select value={currency} onChange={(e) => update('currency', e.target.value)} className="input min-w-[100px]">
        <option value="">All Currencies</option>
        {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
