import { useDeferredValue, useEffect, useMemo, useState, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Globe2,
  Landmark,
  Package,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { accountDetailApi } from '../api/accountDetailApi';

interface InterestTier {
  id?: number;
  tierName: string;
  minBalance: number;
  maxBalance: number | null;
  interestRate: number;
  isActive?: boolean;
}

interface ProductCatalogEntry {
  code: string;
  name: string;
  description: string;
  category: string;
  currency: string;
  minOpeningBalance: number;
  minOperatingBalance: number;
  maxBalance: number | null;
  interestRate: number;
  interestBearing: boolean;
  monthlyMaintenanceFee: number;
  smsAlertFee: number;
  allowsOverdraft: boolean;
  maxOverdraftLimit: number;
  allowsChequeBook: boolean;
  allowsDebitCard: boolean;
  allowsMobile: boolean;
  allowsInternet: boolean;
  allowsSweep: boolean;
  dormancyDays: number | null;
  isActive: boolean;
  interestTiers: InterestTier[];
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeInterestTier(entry: Record<string, unknown>): InterestTier {
  return {
    id: asNullableNumber(entry.id) ?? undefined,
    tierName: String(entry.tierName ?? 'Interest tier'),
    minBalance: asNumber(entry.minBalance),
    maxBalance: asNullableNumber(entry.maxBalance),
    interestRate: asNumber(entry.interestRate),
    isActive: entry.isActive !== false,
  };
}

function normalizeProduct(entry: Record<string, unknown>): ProductCatalogEntry {
  const baseInterestRate = asNumber(entry.interestRate ?? entry.baseInterestRate);

  return {
    code: String(entry.productCode ?? entry.code ?? ''),
    name: String(entry.productName ?? entry.name ?? ''),
    description: String(entry.description ?? '').trim(),
    category: String(entry.productCategory ?? entry.category ?? 'UNCATEGORIZED'),
    currency: String(entry.currency ?? entry.currencyCode ?? 'NGN'),
    minOpeningBalance: asNumber(entry.minimumOpeningBalance ?? entry.minOpeningBalance),
    minOperatingBalance: asNumber(entry.minimumBalance ?? entry.minOperatingBalance),
    maxBalance: asNullableNumber(entry.maxBalance),
    interestRate: baseInterestRate,
    interestBearing: entry.interestBearing !== false && baseInterestRate > 0,
    monthlyMaintenanceFee: asNumber(entry.monthlyMaintenanceFee),
    smsAlertFee: asNumber(entry.smsAlertFee),
    allowsOverdraft: asBoolean(entry.overdraftAllowed ?? entry.allowsOverdraft),
    maxOverdraftLimit: asNumber(entry.maxOverdraftLimit),
    allowsChequeBook: asBoolean(entry.chequeBookAllowed ?? entry.allowsChequeBook),
    allowsDebitCard: asBoolean(entry.debitCardAllowed ?? entry.allowsDebitCard),
    allowsMobile: asBoolean(entry.mobileEnabled ?? entry.allowsMobile),
    allowsInternet: asBoolean(entry.internetEnabled ?? entry.allowsInternet),
    allowsSweep: asBoolean(entry.allowsSweep),
    dormancyDays: asNullableNumber(entry.dormancyDays),
    isActive: entry.isActive !== false,
    interestTiers: Array.isArray(entry.interestTiers)
      ? entry.interestTiers.map((tier) => normalizeInterestTier(tier as Record<string, unknown>))
      : [],
  };
}

function productCapabilities(product: ProductCatalogEntry) {
  return [
    product.allowsDebitCard ? 'Debit card' : null,
    product.allowsChequeBook ? 'Cheque book' : null,
    product.allowsMobile ? 'Mobile banking' : null,
    product.allowsInternet ? 'Internet banking' : null,
    product.allowsOverdraft ? 'Overdraft' : null,
    product.allowsSweep ? 'Sweep enabled' : null,
    product.interestBearing ? 'Interest bearing' : null,
  ].filter((item): item is string => item !== null);
}

function ProductMetric({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
}) {
  return (
    <div className="product-catalog-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="product-catalog-mini-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function ProductCatalogPage() {
  useEffect(() => {
    document.title = 'Account Products | CBS';
  }, []);

  const navigate = useNavigate();
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const { data: allProductsData = [], isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ['account-products', 'all'],
    queryFn: () => accountDetailApi.getProducts(),
    staleTime: 60_000,
  });

  const { data: categoryProductsData = [], isLoading: isLoadingCategoryProducts } = useQuery({
    queryKey: ['account-products', 'category', category],
    queryFn: () => accountDetailApi.getProductsByCategory(category),
    enabled: category !== 'ALL',
    staleTime: 60_000,
  });

  const { data: expandedProductData, isLoading: isLoadingExpandedProduct } = useQuery({
    queryKey: ['account-products', 'detail', expandedCode],
    queryFn: () => accountDetailApi.getProduct(expandedCode as string),
    enabled: Boolean(expandedCode),
    staleTime: 60_000,
  });

  const allProducts = useMemo(
    () => (Array.isArray(allProductsData) ? allProductsData : []).map((entry) => normalizeProduct(entry as Record<string, unknown>)),
    [allProductsData],
  );

  const visibleProducts = useMemo(() => {
    const rawProducts = category === 'ALL' ? allProductsData : categoryProductsData;
    return (Array.isArray(rawProducts) ? rawProducts : []).map((entry) => normalizeProduct(entry as Record<string, unknown>));
  }, [allProductsData, category, categoryProductsData]);

  const categories = useMemo(() => {
    const discovered = Array.from(new Set(allProducts.map((product) => product.category))).sort((left, right) => left.localeCompare(right));
    return ['ALL', ...discovered];
  }, [allProducts]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allProducts.forEach((product) => {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    });
    return counts;
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    if (!deferredSearch.trim()) {
      return visibleProducts;
    }

    const query = deferredSearch.trim().toLowerCase();
    return visibleProducts.filter((product) =>
      product.code.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.currency.toLowerCase().includes(query),
    );
  }, [deferredSearch, visibleProducts]);

  const activeProducts = allProducts.filter((product) => product.isActive);
  const supportedCurrencies = new Set(allProducts.map((product) => product.currency));
  const highestRate = allProducts.reduce((max, product) => Math.max(max, product.interestRate), 0);
  const averageOpeningBalance = allProducts.length > 0
    ? allProducts.reduce((sum, product) => sum + product.minOpeningBalance, 0) / allProducts.length
    : 0;
  const debitCardReadyCount = allProducts.filter((product) => product.allowsDebitCard).length;
  const overdraftEnabledCount = allProducts.filter((product) => product.allowsOverdraft).length;
  const zeroFeeCount = allProducts.filter((product) => product.monthlyMaintenanceFee === 0).length;

  const currentExpandedProduct = useMemo(() => {
    if (!expandedCode) {
      return null;
    }

    if (expandedProductData && !isLoadingExpandedProduct) {
      return normalizeProduct(expandedProductData as Record<string, unknown>);
    }

    return allProducts.find((product) => product.code === expandedCode) ?? null;
  }, [allProducts, expandedCode, expandedProductData, isLoadingExpandedProduct]);

  const isLoading = isLoadingAllProducts || (category !== 'ALL' && isLoadingCategoryProducts);

  return (
    <div className="page-container space-y-6">
      <section className="product-catalog-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="product-catalog-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Live product catalog
              </div>
              <div className="product-catalog-chip">{activeProducts.length} active products</div>
              <div className="product-catalog-chip">{supportedCurrencies.size || 0} currencies supported</div>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Account Products</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Browse the live account product catalog, compare pricing and servicing rules, and launch origination with the selected product already in context.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProductMetric
                label="Active Products"
                value={activeProducts.length.toLocaleString()}
                helper="Live products currently enabled for origination"
                icon={Package}
              />
              <ProductMetric
                label="Categories"
                value={Math.max(categories.length - 1, 0).toLocaleString()}
                helper="Product groups derived from the live catalog"
                icon={WalletCards}
              />
              <ProductMetric
                label="Highest Rate"
                value={formatPercent(highestRate)}
                helper="Highest base interest rate currently configured"
                icon={Coins}
              />
              <ProductMetric
                label="Avg Opening"
                value={formatMoney(averageOpeningBalance)}
                helper="Average minimum opening balance across products"
                icon={Landmark}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="product-catalog-side-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Primary Action</p>
                  <h2 className="mt-2 text-lg font-semibold">Open a New Account</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Move directly into the account origination workflow from the product catalog.</p>
                </div>
                <div className="product-catalog-mini-icon">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
              <button type="button" onClick={() => navigate('/accounts/open')} className="btn-primary mt-5 w-full justify-center">
                Start Account Opening
              </button>
            </div>

            <div className="product-catalog-side-card">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Catalog Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="product-catalog-side-row">
                  <span className="text-sm text-muted-foreground">Debit-card ready</span>
                  <span className="text-sm font-semibold">{debitCardReadyCount}</span>
                </div>
                <div className="product-catalog-side-row">
                  <span className="text-sm text-muted-foreground">Overdraft-enabled</span>
                  <span className="text-sm font-semibold">{overdraftEnabledCount}</span>
                </div>
                <div className="product-catalog-side-row">
                  <span className="text-sm text-muted-foreground">Zero maintenance fee</span>
                  <span className="text-sm font-semibold">{zeroFeeCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="product-catalog-sidebar-shell">
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Catalog Filters</p>
              <h2 className="mt-2 text-lg font-semibold">Find the right product</h2>
              <p className="mt-1 text-sm text-muted-foreground">Search the live catalog by code, name, category, or currency.</p>
            </div>

            <div className="product-catalog-search-shell">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by code, name, category, or currency"
                className="product-catalog-search-input"
              />
            </div>

            <div role="navigation" aria-label="Product categories" className="space-y-2">
              {categories.map((productCategory) => (
                <button
                  key={productCategory}
                  type="button"
                  onClick={() => {
                    setCategory(productCategory);
                    setExpandedCode(null);
                  }}
                  className={cn(
                    'product-catalog-category-button',
                    category === productCategory && 'product-catalog-category-button-active',
                  )}
                >
                  <span>{productCategory === 'ALL' ? 'All Products' : titleCase(productCategory)}</span>
                  <span className="product-catalog-category-count">
                    {productCategory === 'ALL' ? allProducts.length : categoryCounts.get(productCategory) ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="product-catalog-note-card space-y-3">
              <div className="flex items-start gap-3">
                <div className="product-catalog-mini-icon">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Live product definitions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Balances, fees, and servicing capabilities on this page come from the account product master, not static UI presets.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="product-catalog-note-row">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{debitCardReadyCount} products support debit cards</span>
                </div>
                <div className="product-catalog-note-row">
                  <Globe2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{supportedCurrencies.size || 0} operating currencies in the catalog</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="product-catalog-workspace-shell">
          <div className="product-catalog-banner">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Catalog Workspace</p>
                <h2 className="mt-2 text-xl font-semibold">Live product lineup</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category === 'ALL'
                    ? 'Compare products side by side and open the selected one in the origination workflow.'
                    : `${titleCase(category)} products currently available in the live account master.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="product-catalog-chip">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  {category === 'ALL' ? 'All categories' : titleCase(category)}
                </div>
                <div className="product-catalog-chip">
                  {filteredProducts.length} result{filteredProducts.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>

          <div className="product-catalog-content-shell">
            {isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="product-catalog-card animate-pulse">
                    <div className="h-5 w-32 rounded bg-muted" />
                    <div className="mt-4 h-7 w-52 rounded bg-muted" />
                    <div className="mt-3 h-4 w-full rounded bg-muted" />
                    <div className="mt-2 h-4 w-4/5 rounded bg-muted" />
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="h-20 rounded-2xl bg-muted" />
                      <div className="h-20 rounded-2xl bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-border/70 bg-card/80 px-6 py-16 text-center shadow-sm">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold">No products match this view</h3>
                <p className="mt-2 text-sm text-muted-foreground">Adjust the search query or switch to another category to see more products.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredProducts.map((product) => {
                  const isExpanded = expandedCode === product.code;
                  const detailProduct = isExpanded && currentExpandedProduct?.code === product.code ? currentExpandedProduct : product;
                  const capabilities = productCapabilities(detailProduct);

                  return (
                    <article key={product.code} className="product-catalog-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="product-catalog-code-chip">{product.code}</span>
                            <span className="product-catalog-category-chip">{titleCase(product.category)}</span>
                            <StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold tracking-tight">{product.name}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {product.description || 'Configured live account product available in the account master.'}
                            </p>
                          </div>
                        </div>
                        <div className="product-catalog-mini-icon">
                          <Package className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="product-catalog-stat-tile">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Opening Balance</p>
                          <p className="mt-2 text-base font-semibold font-mono">{formatMoney(detailProduct.minOpeningBalance, detailProduct.currency)}</p>
                        </div>
                        <div className="product-catalog-stat-tile">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Base Rate</p>
                          <p className="mt-2 text-base font-semibold font-mono">{formatPercent(detailProduct.interestRate)}</p>
                        </div>
                        <div className="product-catalog-stat-tile">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Maintenance Fee</p>
                          <p className="mt-2 text-base font-semibold font-mono">
                            {detailProduct.monthlyMaintenanceFee === 0 ? 'Free' : formatMoney(detailProduct.monthlyMaintenanceFee, detailProduct.currency)}
                          </p>
                        </div>
                        <div className="product-catalog-stat-tile">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Currency</p>
                          <p className="mt-2 text-base font-semibold">{detailProduct.currency}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {capabilities.length > 0 ? capabilities.map((capability) => (
                          <span key={capability} className="product-catalog-feature-chip">{capability}</span>
                        )) : (
                          <span className="product-catalog-feature-chip">Standard servicing</span>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedCode(isExpanded ? null : product.code)}
                          className="product-catalog-inline-action"
                        >
                          {isExpanded ? 'Hide details' : 'View details'}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/accounts/open?productCode=${encodeURIComponent(product.code)}`)}
                          className="btn-primary"
                        >
                          Open with Product
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-5 border-t border-border/70 pt-5">
                          {isLoadingExpandedProduct && expandedCode === product.code ? (
                            <div className="space-y-3">
                              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="h-20 rounded-2xl bg-muted animate-pulse" />
                                <div className="h-20 rounded-2xl bg-muted animate-pulse" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operating Balance</p>
                                  <p className="mt-2 text-sm font-semibold font-mono">{formatMoney(detailProduct.minOperatingBalance, detailProduct.currency)}</p>
                                </div>
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">SMS Alert Fee</p>
                                  <p className="mt-2 text-sm font-semibold font-mono">{formatMoney(detailProduct.smsAlertFee, detailProduct.currency)}</p>
                                </div>
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dormancy</p>
                                  <p className="mt-2 text-sm font-semibold">
                                    {detailProduct.dormancyDays != null ? `${detailProduct.dormancyDays} days` : 'Not configured'}
                                  </p>
                                </div>
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overdraft Limit</p>
                                  <p className="mt-2 text-sm font-semibold font-mono">
                                    {detailProduct.allowsOverdraft ? formatMoney(detailProduct.maxOverdraftLimit, detailProduct.currency) : 'Not allowed'}
                                  </p>
                                </div>
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Max Balance</p>
                                  <p className="mt-2 text-sm font-semibold font-mono">
                                    {detailProduct.maxBalance != null ? formatMoney(detailProduct.maxBalance, detailProduct.currency) : 'No cap configured'}
                                  </p>
                                </div>
                                <div className="product-catalog-detail-tile">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Interest Posting</p>
                                  <p className="mt-2 text-sm font-semibold">
                                    {detailProduct.interestBearing ? 'Enabled on product' : 'Non-interest bearing'}
                                  </p>
                                </div>
                              </div>

                              {detailProduct.interestTiers.length > 0 ? (
                                <div className="product-catalog-note-card space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-semibold">Interest Tiers</p>
                                  </div>
                                  <div className="space-y-2">
                                    {detailProduct.interestTiers.map((tier) => (
                                      <div key={tier.id ?? tier.tierName} className="product-catalog-tier-row">
                                        <div>
                                          <p className="text-sm font-medium">{tier.tierName}</p>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {formatMoney(tier.minBalance, detailProduct.currency)} to {tier.maxBalance != null ? formatMoney(tier.maxBalance, detailProduct.currency) : 'No upper limit'}
                                          </p>
                                        </div>
                                        <span className="text-sm font-semibold font-mono">{formatPercent(tier.interestRate)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
