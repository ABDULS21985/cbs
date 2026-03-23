import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Trash2, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { accountOpeningApi, type CustomerSearchResult } from '../../api/accountOpeningApi';
import { queryKeys } from '@/lib/queryKeys';

export interface Signatory {
  customerId: string;
  fullName: string;
  role: string;
}

interface SignatoryManagerProps {
  signatories: Signatory[];
  onChange: (signatories: Signatory[]) => void;
  signingRule: string;
  onRuleChange: (rule: string) => void;
}

const SIGNING_RULES = [
  { value: 'ANY_ONE', label: 'Any One', description: 'Any single signatory can authorize transactions' },
  { value: 'ANY_TWO', label: 'Any Two', description: 'Any two signatories must jointly authorize' },
  { value: 'ALL', label: 'All Signatories', description: 'All signatories must jointly authorize' },
];

const SIGNATORY_ROLES = ['Primary', 'Secondary', 'Authorized Signatory', 'Managing Director', 'Finance Director'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SignatoryManager({ signatories, onChange, signingRule, onRuleChange }: SignatoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingRole, setEditingRole] = useState<{ index: number; value: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 350);

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKeys.customers.search(debouncedQuery),
    queryFn: () => accountOpeningApi.searchCustomers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSignatory = (customer: CustomerSearchResult) => {
    if (signatories.some((s) => s.customerId === customer.id)) return;
    onChange([
      ...signatories,
      { customerId: customer.id, fullName: customer.fullName, role: 'Authorized Signatory' },
    ]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeSignatory = (index: number) => {
    onChange(signatories.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, role: string) => {
    const updated = signatories.map((s, i) => (i === index ? { ...s, role } : s));
    onChange(updated);
    setEditingRole(null);
  };

  const filteredResults = results.filter((r) => !signatories.some((s) => s.customerId === r.id));

  return (
    <div className="space-y-4">
      {/* Signing Rule */}
      <div>
        <label className="block text-sm font-medium mb-2">Signing Rule</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SIGNING_RULES.map((rule) => (
            <button
              key={rule.value}
              type="button"
              onClick={() => onRuleChange(rule.value)}
              className={cn(
                'opening-selection-card',
                signingRule === rule.value && 'opening-selection-card-active',
              )}
            >
              <p className={cn('text-sm font-medium', signingRule === rule.value && 'text-primary')}>{rule.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Signatories List */}
      {signatories.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Added Signatories ({signatories.length})</label>
          <ul className="space-y-2">
            {signatories.map((sig, index) => (
              <li key={sig.customerId} className="flex items-center gap-3 opening-note-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sig.fullName}</p>
                  {editingRole?.index === index ? (
                    <select
                      autoFocus
                      value={editingRole.value}
                      onChange={(e) => setEditingRole({ index, value: e.target.value })}
                      onBlur={() => updateRole(index, editingRole.value)}
                      className="text-xs mt-0.5 rounded border bg-background px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {SIGNATORY_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingRole({ index, value: sig.role })}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 text-left"
                    >
                      {sig.role} <span className="text-primary/70">(click to edit)</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeSignatory(index)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Signatory Search */}
      <div ref={containerRef} className="relative">
        <label className="block text-sm font-medium mb-1.5">Add Signatory</label>
        <div className="opening-search-shell">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
            placeholder="Search customer to add as signatory..."
            className="opening-field-input border-0 bg-transparent pl-10 pr-4 focus:ring-primary/30"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {showDropdown && debouncedQuery.length >= 2 && (
          <div className="opening-search-dropdown z-50">
            {filteredResults.length === 0 && !isFetching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">No customers found</div>
            ) : (
              <ul className="divide-y max-h-48 overflow-y-auto">
                {filteredResults.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => addSignatory(customer)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{customer.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
