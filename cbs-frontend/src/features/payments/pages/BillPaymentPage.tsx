import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  History,
  Loader2,
  Printer,
  Receipt,
  Search,
  Star,
  StarOff,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/formatters';
import { toast } from 'sonner';

import { BillerCategoryGrid } from '../components/bills/BillerCategoryGrid';
import { BillPaymentForm } from '../components/bills/BillPaymentForm';
import {
  billPaymentApi,
  type BillFavorite,
  type Biller,
  type BillerCategory,
  type BillPaymentRecord,
  type BillPaymentResponse,
} from '../api/billPaymentApi';

type Step = 'category' | 'biller' | 'pay' | 'receipt';
type Tab = 'pay' | 'history';

const stepLabels: Record<Exclude<Step, 'receipt'>, string> = {
  category: 'Choose a category',
  biller: 'Select a biller',
  pay: 'Enter payment details',
};

export function BillPaymentPage() {
  useEffect(() => {
    document.title = 'Bill Payment | CBS';
  }, []);

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pay');
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<BillerCategory | null>(null);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [receipt, setReceipt] = useState<BillPaymentResponse | null>(null);
  const [billerSearch, setBillerSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [prefillFields, setPrefillFields] = useState<Record<string, string> | undefined>();

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['bill-categories'],
    queryFn: () => billPaymentApi.getCategories(),
  });

  const { data: billers = [], isLoading: loadingBillers } = useQuery({
    queryKey: ['billers', selectedCategory?.code],
    queryFn: () => billPaymentApi.getBillersByCategory(selectedCategory!.code),
    enabled: !!selectedCategory,
  });

  const { data: favorites = [], isLoading: loadingFavorites } = useQuery({
    queryKey: ['bill-favorites'],
    queryFn: () => billPaymentApi.getFavorites(),
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['bill-search', globalSearch],
    queryFn: () => billPaymentApi.searchBillers(globalSearch),
    enabled: globalSearch.length >= 2,
  });

  const { data: paymentHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['bill-history'],
    queryFn: () => billPaymentApi.getPaymentHistory({ size: 50 }),
    enabled: activeTab === 'history',
  });

  const filteredBillers = useMemo(() => {
    if (!billerSearch) {
      return billers;
    }

    const query = billerSearch.toLowerCase();
    return billers.filter((biller) =>
      biller.name.toLowerCase().includes(query) || biller.code.toLowerCase().includes(query),
    );
  }, [billers, billerSearch]);

  const handleFavoriteClick = (favorite: BillFavorite) => {
    const matchedCategory = categories.find((category) => category.code === favorite.categoryCode);
    if (matchedCategory) {
      setSelectedCategory(matchedCategory);
    }

    setSelectedBiller({
      id: 0,
      code: favorite.billerCode,
      name: favorite.billerName,
      categoryCode: favorite.categoryCode,
      fields: [],
      isFixedAmount: false,
      commission: 0,
      commissionType: 'FLAT',
      status: 'ACTIVE',
    });
    setPrefillFields(favorite.fields);
    setStep('pay');
  };

  const handleSearchSelect = (biller: Biller) => {
    setSelectedBiller(biller);
    setGlobalSearch('');
    setStep('pay');
  };

  const handleRemoveFavorite = async (favorite: BillFavorite) => {
    try {
      await billPaymentApi.removeFavorite(favorite.id);
      queryClient.invalidateQueries({ queryKey: ['bill-favorites'] });
      toast.success('Removed from favorites');
    } catch {
      toast.error('Failed to remove favorite');
    }
  };

  const handleRepeatPayment = (record: BillPaymentRecord) => {
    setSelectedBiller({
      id: 0,
      code: record.billerCode,
      name: record.billerName,
      categoryCode: record.categoryCode,
      fields: [],
      isFixedAmount: false,
      commission: 0,
      commissionType: 'FLAT',
      status: 'ACTIVE',
    });
    setActiveTab('pay');
    setStep('pay');
  };

  const handlePrint = () => window.print();

  const resetFlow = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedBiller(null);
    setReceipt(null);
    setPrefillFields(undefined);
    setBillerSearch('');
    queryClient.invalidateQueries({ queryKey: ['bill-history'] });
    queryClient.invalidateQueries({ queryKey: ['bill-favorites'] });
  };

  if (step === 'receipt' && receipt) {
    const isSuccess = receipt.status === 'SUCCESSFUL';
    const isPending = receipt.status === 'PENDING';
    const statusIcon = isSuccess
      ? <CheckCircle className="h-10 w-10 text-emerald-600" />
      : isPending
        ? <Clock className="h-10 w-10 text-amber-500" />
        : <XCircle className="h-10 w-10 text-red-500" />;
    const statusLabel = isSuccess ? 'Payment Successful' : isPending ? 'Payment Pending' : 'Payment Failed';

    return (
      <>
        <PageHeader title="Payment Receipt" subtitle="Settlement outcome and bill confirmation" />
        <div className="page-container max-w-5xl space-y-6 print:py-2">
          <section className="payment-hero-shell max-w-3xl mx-auto">
            <div className="payment-hero-grid lg:grid-cols-1">
              <div>
                <p className="payment-hero-kicker">Receipt generated</p>
                <h2 className="payment-hero-title">{statusLabel}</h2>
                <p className="payment-hero-description">
                  Capture the reference, confirmation number, and token before exiting this receipt.
                </p>
                <div className="payment-step-chip-row">
                  <span className="payment-step-chip">{receipt.billerName}</span>
                  <span className="payment-step-chip">{receipt.status}</span>
                </div>
              </div>
              <div className="payment-metrics-grid">
                <div className="payment-metric-card">
                  <p className="payment-metric-label">Amount</p>
                  <p className="payment-metric-value">{formatMoney(receipt.amount, 'NGN')}</p>
                </div>
                <div className="payment-metric-card">
                  <p className="payment-metric-label">Total debit</p>
                  <p className="payment-metric-value">{formatMoney(receipt.totalDebit, 'NGN')}</p>
                </div>
                <div className="payment-metric-card">
                  <p className="payment-metric-label">Reference</p>
                  <p className="payment-metric-value text-base">{receipt.transactionRef}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="payment-workspace-shell max-w-3xl mx-auto space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/60">
              {statusIcon}
            </div>

            <div className="payment-panel overflow-hidden">
              <div className="divide-y">
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Biller</span>
                  <span className="font-medium text-foreground">{receipt.billerName}</span>
                </div>
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono text-foreground">{formatMoney(receipt.amount, 'NGN')}</span>
                </div>
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-mono text-foreground">{formatMoney(receipt.fee, 'NGN')}</span>
                </div>
                <div className="flex justify-between px-5 py-3 text-sm font-semibold">
                  <span>Total Debit</span>
                  <span className="font-mono text-foreground">{formatMoney(receipt.totalDebit, 'NGN')}</span>
                </div>
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs text-foreground select-all">{receipt.transactionRef}</span>
                </div>
                {receipt.confirmationNumber ? (
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-muted-foreground">Confirmation #</span>
                    <span className="font-mono text-xs text-foreground select-all">{receipt.confirmationNumber}</span>
                  </div>
                ) : null}
                {receipt.token ? (
                  <div className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-muted-foreground">Token</span>
                    <span className="font-mono font-bold text-emerald-600 select-all">{receipt.token}</span>
                  </div>
                ) : null}
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={receipt.status} />
                </div>
                <div className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">{formatDateTime(receipt.paidAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 print:hidden">
              <button onClick={handlePrint} className="payment-action-button">
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={resetFlow}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Make Another Payment
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const heroMetrics = activeTab === 'history'
    ? [
        { label: 'History records', value: String(paymentHistory.length || 0) },
        { label: 'Successful', value: String(paymentHistory.filter((record) => record.status === 'SUCCESSFUL').length) },
        { label: 'Pending', value: String(paymentHistory.filter((record) => record.status === 'PENDING').length) },
      ]
    : [
        { label: 'Categories', value: String(categories.length || 0) },
        { label: 'Favorites', value: String(favorites.length || 0) },
        { label: 'Search matches', value: globalSearch.length >= 2 ? String(searchResults.length || 0) : 'Ready' },
      ];

  return (
    <>
      <PageHeader
        title="Bill Payments"
        subtitle="Pay bills, purchase airtime, and manage recurring utility collections"
      />

      <div className="page-container space-y-6">
        <section className="payment-hero-shell">
          <div className="payment-hero-grid">
            <div>
              <p className="payment-hero-kicker">Retail collections</p>
              <h2 className="payment-hero-title">Utility, subscription, and airtime settlement command center</h2>
              <p className="payment-hero-description">
                Search across billers, jump into favorites, validate customer references, and review receipt outcomes without leaving the workflow.
              </p>
              <div className="payment-step-chip-row">
                <span className="payment-step-chip">{activeTab === 'pay' ? 'Pay flow' : 'History view'}</span>
                {activeTab === 'pay' ? <span className="payment-step-chip">{stepLabels[step as Exclude<Step, 'receipt'>]}</span> : null}
                {selectedCategory ? <span className="payment-step-chip">{selectedCategory.name}</span> : null}
                {selectedBiller ? <span className="payment-step-chip">{selectedBiller.name}</span> : null}
              </div>
            </div>

            <div className="space-y-3">
              {activeTab === 'pay' && step === 'category' ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search all billers, such as DSTV, IKEDC, or MTN"
                    className="payment-command-input pl-10 pr-10"
                  />
                  {searching ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}

                  {globalSearch.length >= 2 && searchResults.length > 0 ? (
                    <div className="payment-panel absolute left-0 right-0 z-10 mt-2 max-h-64 overflow-y-auto">
                      {searchResults.map((biller) => (
                        <button
                          key={biller.id}
                          onClick={() => handleSearchSelect(biller)}
                          className="w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/40 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-foreground">{biller.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{biller.categoryCode} - {biller.code}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {globalSearch.length >= 2 && !searching && searchResults.length === 0 ? (
                    <div className="payment-panel absolute left-0 right-0 z-10 mt-2 px-4 py-3 text-sm text-muted-foreground">
                      No billers found for "{globalSearch}"
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="payment-metrics-grid">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="payment-metric-card">
                    <p className="payment-metric-label">{metric.label}</p>
                    <p className="payment-metric-value">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="payment-workspace-shell space-y-5">
          <div className="payment-tab-strip">
            <button
              onClick={() => setActiveTab('pay')}
              className="payment-tab-button"
              data-active={activeTab === 'pay' ? 'true' : 'false'}
            >
              <Receipt className="h-4 w-4" />
              Pay Bill
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="payment-tab-button"
              data-active={activeTab === 'history' ? 'true' : 'false'}
            >
              <History className="h-4 w-4" />
              Payment History
            </button>
          </div>

          {activeTab === 'history' ? (
            loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="payment-empty-state">
                <History className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground">No payment history yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Completed bill settlements will appear here for quick repeats.
                  </p>
                </div>
              </div>
            ) : (
              <div className="payment-panel overflow-hidden">
                <div className="divide-y">
                  {paymentHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{record.billerName}</p>
                          <StatusBadge status={record.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <span className="text-xs text-muted-foreground">{formatDateTime(record.paidAt)}</span>
                          <span className="text-xs font-mono text-muted-foreground">{record.transactionRef}</span>
                        </div>
                        {record.token ? (
                          <p className="mt-1 text-xs font-mono text-emerald-600">Token: {record.token}</p>
                        ) : null}
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-foreground">{formatMoney(record.amount, 'NGN')}</span>
                        {record.status === 'SUCCESSFUL' ? (
                          <button onClick={() => handleRepeatPayment(record)} className="text-xs font-medium text-primary hover:underline">
                            Pay Again
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              {step === 'category' && !loadingFavorites && favorites.length > 0 ? (
                <section className="payment-panel p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-foreground">Saved Favorites</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="payment-favorite-card group">
                        <button onClick={() => handleFavoriteClick(favorite)} className="w-full text-left">
                          <p className="text-sm font-semibold text-foreground truncate">{favorite.alias || favorite.billerName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{favorite.billerCode}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Last: {formatMoney(favorite.lastPaidAmount, 'NGN')} - {formatRelative(favorite.lastPaidAt)}
                          </p>
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveFavorite(favorite);
                          }}
                          className="absolute right-3 top-3 rounded-md p-1 opacity-0 transition-all hover:bg-muted group-hover:opacity-100"
                          title="Remove favorite"
                        >
                          <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {step === 'category' ? (
                loadingCategories ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="payment-empty-state">
                    <Receipt className="h-10 w-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium text-foreground">No bill categories available</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Categories will appear here once the biller catalog is available.
                      </p>
                    </div>
                  </div>
                ) : (
                  <section className="payment-panel p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Choose a bill category</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Start with a utility family, then drill into a live biller and validate the customer reference.
                      </p>
                    </div>
                    <BillerCategoryGrid
                      categories={categories}
                      onSelect={(category) => {
                        setSelectedCategory(category);
                        setBillerSearch('');
                        setStep('biller');
                      }}
                    />
                  </section>
                )
              ) : null}

              {step === 'biller' && selectedCategory ? (
                <section className="payment-panel p-5 space-y-5">
                  <button
                    onClick={() => {
                      setStep('category');
                      setSelectedCategory(null);
                    }}
                    className="payment-action-button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to categories
                  </button>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{selectedCategory.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose the exact biller you want to settle for this category.
                      </p>
                    </div>
                    {billers.length > 5 ? (
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={billerSearch}
                          onChange={(event) => setBillerSearch(event.target.value)}
                          placeholder="Filter billers"
                          className="payment-command-input pl-9"
                        />
                      </div>
                    ) : null}
                  </div>

                  {loadingBillers ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredBillers.length === 0 ? (
                    <div className="payment-empty-state">
                      <Search className="h-10 w-10 text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {billerSearch ? `No billers matching "${billerSearch}"` : 'No billers available in this category'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredBillers.map((biller) => (
                        <button
                          key={biller.id}
                          onClick={() => {
                            setSelectedBiller(biller);
                            setPrefillFields(undefined);
                            setStep('pay');
                          }}
                          className="payment-selection-card"
                        >
                          <div className="flex items-center gap-3">
                            {biller.logoUrl ? (
                              <img src={biller.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                                {biller.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{biller.name}</p>
                              <p className="text-xs text-muted-foreground">{biller.code}</p>
                            </div>
                          </div>
                          {biller.isFixedAmount && biller.fixedAmount ? (
                            <p className="mt-3 text-xs font-mono text-muted-foreground">
                              Fixed: {formatMoney(biller.fixedAmount, 'NGN')}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {step === 'pay' && selectedBiller ? (
                <BillPaymentForm
                  biller={selectedBiller}
                  prefillFields={prefillFields}
                  onSuccess={(result) => {
                    setReceipt(result);
                    setStep('receipt');
                  }}
                  onBack={() => {
                    setPrefillFields(undefined);
                    setStep(selectedCategory ? 'biller' : 'category');
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
