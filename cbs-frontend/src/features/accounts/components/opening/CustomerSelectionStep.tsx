import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared';
import { accountOpeningApi, type CustomerSearchResult } from '../../api/accountOpeningApi';
import { queryKeys } from '@/lib/queryKeys';

interface CustomerSelectionStepProps {
  onNext: (customer: CustomerSearchResult) => void;
  initialSelectedCustomer?: CustomerSearchResult | null;
  customerContextId?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function KycIcon({ status }: { status: CustomerSearchResult['kycStatus'] }) {
  if (status === 'VERIFIED') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'PENDING') return <Clock className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

export function CustomerSelectionStep({ onNext, initialSelectedCustomer, customerContextId }: CustomerSelectionStepProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(initialSelectedCustomer ?? null);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 350);

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

  useEffect(() => {
    if (initialSelectedCustomer) {
      setSelectedCustomer(initialSelectedCustomer);
      setQuery(initialSelectedCustomer.fullName);
    }
  }, [initialSelectedCustomer]);

  const handleSelect = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setQuery(customer.fullName);
    setShowDropdown(false);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowDropdown(true);
    if (!value) setSelectedCustomer(null);
  };

  const canProceed = selectedCustomer && selectedCustomer.kycStatus === 'VERIFIED';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Select Customer</h2>
        <p className="text-sm text-muted-foreground mt-1">Search for an existing customer by name, CIF, email, or phone.</p>
      </div>

      {customerContextId && initialSelectedCustomer && (
        <div className="opening-note-card flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Customer context loaded from the profile flow</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Customer ID {customerContextId} is prefilled. You can continue with this customer or search for another one.
            </p>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div ref={containerRef} className="relative">
        <div className="opening-search-shell">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            placeholder="Search by name, CIF, email, or phone..."
            className="opening-field-input border-0 bg-transparent pl-10 pr-4 py-3 focus:ring-primary/30"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && debouncedQuery.length >= 2 && (
          <div className="opening-search-dropdown z-50">
            {results.length === 0 && !isFetching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">No customers found</div>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {results.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0',
                        customer.type === 'CORPORATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-primary/10 text-primary',
                      )}>
                        {customer.type === 'CORPORATE' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{customer.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.email} · {customer.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={customer.kycStatus} />
                        <KycIcon status={customer.kycStatus} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected Customer Card */}
      {selectedCustomer && (
        <div className={cn(
          'opening-section-card transition-colors',
          selectedCustomer.kycStatus === 'VERIFIED' ? 'border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10' : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10',
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
              selectedCustomer.type === 'CORPORATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-primary/10 text-primary',
            )}>
              {selectedCustomer.type === 'CORPORATE' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{selectedCustomer.fullName}</h3>
                <StatusBadge status={selectedCustomer.kycStatus} dot />
                <StatusBadge status={selectedCustomer.type} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCustomer.segment} segment</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-xs text-muted-foreground">Phone: </span>
                  <span className="text-xs font-medium">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email: </span>
                  <span className="text-xs font-medium truncate">{selectedCustomer.email}</span>
                </div>
                {selectedCustomer.bvn && (
                  <div>
                    <span className="text-xs text-muted-foreground">BVN: </span>
                    <span className="text-xs font-mono font-medium">{selectedCustomer.bvn.replace(/(\d{5})(\d{6})/, '$1••••••')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedCustomer.kycStatus !== 'VERIFIED' && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-100 dark:bg-amber-900/20 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This customer's KYC status is <strong>{selectedCustomer.kycStatus}</strong>. KYC must be verified before opening an account.
                Please complete KYC verification first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Customer CTA */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => navigate('/customers/onboarding?returnUrl=/accounts/open')}
        className="opening-selection-card w-full flex items-center justify-center gap-2 border-dashed text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <UserPlus className="w-4 h-4" />
        Register New Customer
      </button>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => selectedCustomer && onNext(selectedCustomer)}
          className={cn('btn-primary', !canProceed && 'cursor-not-allowed opacity-60')}
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
