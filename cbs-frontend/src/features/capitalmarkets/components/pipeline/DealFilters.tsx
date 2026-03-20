import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealType, DealStatus } from '../../api/capitalMarketsApi';

const ALL_STAGES: DealStatus[] = ['ORIGINATION', 'STRUCTURING', 'MARKETING', 'PRICING', 'ALLOTMENT', 'SETTLED'];
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

export interface DealFilterState {
  type: DealType | 'ALL';
  statuses: DealStatus[];
  currency: string;
  search: string;
}

interface DealFiltersProps {
  filters: DealFilterState;
  onChange: (filters: DealFilterState) => void;
}

export function useDealFilters(): [DealFilterState, (f: DealFilterState) => void] {
  const [params, setParams] = useSearchParams();

  const filters: DealFilterState = {
    type: (params.get('type') as DealType | 'ALL') || 'ALL',
    statuses: params.get('statuses')?.split(',').filter(Boolean) as DealStatus[] || [],
    currency: params.get('currency') || 'ALL',
    search: params.get('q') || '',
  };

  const setFilters = (f: DealFilterState) => {
    const next = new URLSearchParams(params);
    if (f.type && f.type !== 'ALL') next.set('type', f.type); else next.delete('type');
    if (f.statuses.length > 0) next.set('statuses', f.statuses.join(',')); else next.delete('statuses');
    if (f.currency && f.currency !== 'ALL') next.set('currency', f.currency); else next.delete('currency');
    if (f.search) next.set('q', f.search); else next.delete('q');
    setParams(next, { replace: true });
  };

  return [filters, setFilters];
}

export function applyFilters(deals: any[], filters: DealFilterState) {
  return deals.filter((d) => {
    if (filters.type !== 'ALL' && d.type !== filters.type) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(d.status)) return false;
    if (filters.currency !== 'ALL' && d.currency !== filters.currency) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!d.code?.toLowerCase().includes(q) && !d.issuer?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function DealFilters({ filters, onChange }: DealFiltersProps) {
  const activeCount = [
    filters.type !== 'ALL' ? 1 : 0,
    filters.statuses.length,
    filters.currency !== 'ALL' ? 1 : 0,
    filters.search ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => onChange({ type: 'ALL', statuses: [], currency: 'ALL', search: '' });

  const toggleStatus = (s: DealStatus) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        {(['ALL', 'ECM', 'DCM'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onChange({ ...filters, type: t })}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              filters.type === t ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1">
        {ALL_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={cn(
              'px-2 py-1 rounded-full text-[10px] font-medium transition-colors',
              filters.statuses.includes(s)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Currency */}
      <select
        value={filters.currency}
        onChange={(e) => onChange({ ...filters, currency: e.target.value })}
        className="h-7 px-2 text-xs rounded-lg border bg-background"
      >
        <option value="ALL">All CCY</option>
        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search deals…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-7 pr-2 h-7 w-40 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {activeCount > 0 && (
        <>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {activeCount}
          </span>
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            <X className="w-3 h-3" /> Clear
          </button>
        </>
      )}
    </div>
  );
}
