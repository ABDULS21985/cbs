import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { branchOpsApi, type Branch } from '../../api/branchOpsApi';

interface BranchSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export function BranchSelector({ value, onChange }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches', 'list'],
    queryFn: () => branchOpsApi.getBranches(),
    staleTime: 5 * 60 * 1000,
  });

  const selectedBranch = branches.find((b) => b.id === value);

  const filtered = branches.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const displayLabel = value === null
    ? 'All Branches'
    : selectedBranch
      ? `${selectedBranch.name} — ${selectedBranch.city}`
      : 'Select Branch';

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border bg-background text-sm transition-colors',
          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring',
          open && 'ring-2 ring-ring',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="truncate font-medium">{displayLabel}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-72 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search branches..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
                value === null && 'bg-primary/5 text-primary font-medium',
              )}
            >
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                All
              </span>
              <div>
                <div className="font-medium">All Branches</div>
                <div className="text-xs text-muted-foreground">Aggregate view</div>
              </div>
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No branches found</div>
            ) : (
              filtered.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleSelect(branch.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
                    value === branch.id && 'bg-primary/5 text-primary font-medium',
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {branch.code.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{branch.name}</div>
                    <div className="text-xs text-muted-foreground">{branch.city}, {branch.state}</div>
                  </div>
                  {branch.status !== 'ACTIVE' && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{branch.status}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
