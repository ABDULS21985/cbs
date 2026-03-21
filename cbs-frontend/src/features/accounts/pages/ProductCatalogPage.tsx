import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { accountDetailApi } from '../api/accountDetailApi';

const CATEGORIES = ['ALL', 'CURRENT', 'SAVINGS', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT', 'MONEY_MARKET', 'ESCROW', 'GOAL_SAVINGS'];

export function ProductCatalogPage() {
  useEffect(() => { document.title = 'Product Catalog | CBS'; }, []);
  const navigate = useNavigate();
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['account-products', category],
    queryFn: () => category === 'ALL' ? accountDetailApi.getProducts() : accountDetailApi.getProductsByCategory(category),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((p: Record<string, unknown>) =>
      String(p.productCode || '').toLowerCase().includes(q) ||
      String(p.productName || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <>
      <PageHeader title="Account Products" subtitle="Browse and manage account product catalog" />
      <div className="page-container space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              className="w-full pl-10 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors',
                  category === c ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                {c === 'ALL' ? 'All' : c.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Product list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p: Record<string, unknown>) => {
              const code = String(p.productCode || p.code || '');
              const isExpanded = expandedCode === code;
              return (
                <div key={code} className="rounded-lg border bg-card overflow-hidden">
                  <button onClick={() => setExpandedCode(isExpanded ? null : code)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{code}</span>
                          <span className="text-sm font-semibold">{String(p.productName || p.name || '')}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{String(p.productCategory || p.category || '')}</span>
                          <span className="text-xs text-muted-foreground">{String(p.currency || p.currencyCode || 'NGN')}</span>
                          {p.isActive !== undefined && <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t bg-muted/10">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Min Balance</p><p className="font-mono">{formatMoney(Number(p.minimumBalance ?? p.minBalance ?? 0))}</p></div>
                        <div><p className="text-xs text-muted-foreground">Interest Rate</p><p className="font-mono">{formatPercent(Number(p.interestRate ?? p.baseInterestRate ?? 0))}</p></div>
                        <div><p className="text-xs text-muted-foreground">Min Opening</p><p className="font-mono">{formatMoney(Number(p.minimumOpeningBalance ?? 0))}</p></div>
                        <div><p className="text-xs text-muted-foreground">Overdraft</p><p>{p.overdraftAllowed ? 'Yes' : 'No'}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Boolean(p.chequeBookAllowed ?? p.allowsChequeBook) && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">Cheque Book</span>}
                        {Boolean(p.debitCardAllowed ?? p.allowsDebitCard) && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-400">Debit Card</span>}
                        {Boolean(p.mobileEnabled ?? p.allowsMobile) && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-400">Mobile</span>}
                        {Boolean(p.internetEnabled ?? p.allowsInternet) && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded dark:bg-cyan-900/30 dark:text-cyan-400">Internet</span>}
                      </div>
                      <button onClick={() => navigate('/accounts/open')} className="mt-3 px-3 py-1.5 text-xs font-medium text-primary hover:underline">Open account with this product →</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
