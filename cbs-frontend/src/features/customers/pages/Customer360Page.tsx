import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useCustomer, useCustomerAccounts, useCustomerLoans, useCustomerCards, useCustomerCases } from '../hooks/useCustomers';
import { useRecommendations } from '../hooks/useCustomerIntelligence';
import { useCustomerProfitability } from '../hooks/useCustomerAnalytics';
import { CustomerHeader } from '../components/CustomerHeader';
import { ComposeMessageDialog } from '../components/ComposeMessageDialog';
import { CustomerOverviewTab } from '../components/CustomerOverviewTab';
import { CustomerAccountsTab } from '../components/CustomerAccountsTab';
import { CustomerLoansTab } from '../components/CustomerLoansTab';
import { CustomerCardsTab } from '../components/CustomerCardsTab';
import { CustomerCasesTab } from '../components/CustomerCasesTab';
import { CustomerDocumentsTab } from '../components/CustomerDocumentsTab';
import { CustomerTransactionsTab } from '../components/CustomerTransactionsTab';
import { CustomerCommunicationsTab } from '../components/CustomerCommunicationsTab';
import { CustomerAuditTab } from '../components/CustomerAuditTab';
import { CustomerTimeline } from '../components/CustomerTimeline';
import { usePermission } from '@/hooks/usePermission';

// Portfolio components
import { RelationshipSummary } from '../components/portfolio/RelationshipSummary';
import { ProfitabilityAnalysis } from '../components/portfolio/ProfitabilityAnalysis';
import { ProductHoldingsGrid } from '../components/portfolio/ProductHoldingsGrid';
import { CrossSellRecommendations } from '../components/portfolio/CrossSellRecommendations';

// ── Portfolio Tab ────────────────────────────────────────────────────────────

function PortfolioTab({ customerId, customerName }: { customerId: number; customerName: string }) {
  const navigate = useNavigate();
  const { data: accounts = [] } = useCustomerAccounts(customerId);
  const { data: loans = [] } = useCustomerLoans(customerId, true);
  const { data: cards = [] } = useCustomerCards(customerId, true);
  const {
    data: profitabilityData,
    isLoading: profitabilityLoading,
    isError: profitabilityError,
  } = useCustomerProfitability(customerId);
  const {
    data: apiRecommendations = [],
    isError: recommendationsError,
  } = useRecommendations(customerId);

  const profitability =
    profitabilityData &&
    typeof profitabilityData === 'object' &&
    'totalRevenue' in profitabilityData
      ? profitabilityData
      : null;
  const latestMonthlyRevenue = profitability?.monthlyTrend?.at(-1)?.revenue ?? null;

  const totalBalance = accounts.reduce((s, a) => s + (a.availableBalance ?? a.ledgerBalance ?? 0), 0);
  const loanOutstanding = loans.reduce((s, l) => s + (l.outstandingBalance ?? 0), 0);
  const productsHeld = accounts.length + loans.length + cards.length;

  const holdings = [
    {
      category: 'Deposits',
      items: accounts.map((a) => ({
        name: `${a.accountType} — ${a.accountNumber}`,
        value: formatMoney(a.availableBalance ?? a.ledgerBalance ?? 0, a.currency),
        status: a.status,
      })),
    },
    {
      category: 'Lending',
      items: loans.map((l) => ({
        name: l.productName ?? l.loanNumber,
        value: formatMoney(l.outstandingBalance ?? 0),
        status: l.status,
      })),
    },
    {
      category: 'Cards',
      items: cards.map((c) => ({
        name: `${c.scheme} ${c.cardType}`,
        value: c.maskedPan ?? '****',
        status: c.status,
      })),
    },
  ].filter((h) => h.items.length > 0);

  return (
    <div className="p-4 space-y-6">
      <RelationshipSummary
        totalBalance={totalBalance + loanOutstanding}
        productsHeld={productsHeld}
        monthlyRevenue={latestMonthlyRevenue}
        lifetimeValue={profitability?.lifetimeValue ?? null}
      />

      {profitabilityLoading ? (
        <div className="rounded-xl border bg-card p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="h-16 rounded bg-muted" />
              <div className="h-16 rounded bg-muted" />
              <div className="h-16 rounded bg-muted" />
            </div>
          </div>
        </div>
      ) : profitabilityError || !profitability ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Portfolio analytics unavailable</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Profitability data could not be loaded for this customer right now.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <p className="text-sm font-semibold">Live Portfolio Analytics</p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue, cost, and relationship value are loaded from the customer profitability service.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/customers/${customerId}/analytics?tab=profitability`)}
              className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Open Full Analytics
            </button>
          </div>
          <ProfitabilityAnalysis
            revenue={profitability.totalRevenue}
            costOfFunds={profitability.costOfFunds}
            operatingCost={profitability.operatingCost}
            provisions={profitability.provisions}
            netProfit={profitability.netContribution}
            roc={profitability.marginPct}
          />
        </div>
      )}

      <ProductHoldingsGrid holdings={holdings} />

      {recommendationsError ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-5">
          <p className="text-sm font-semibold">Recommendations unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">
            Backend recommendations could not be loaded for this customer, so no fallback recommendations are shown.
          </p>
        </div>
      ) : (
        <CrossSellRecommendations recommendations={apiRecommendations} customerName={customerName} />
      )}
    </div>
  );
}

// ── Relationship Summary Strip ───────────────────────────────────────────────

function RelationshipStrip({ customerId, customer }: { customerId: number; customer: import('../types/customer').Customer }) {
  const { data: accounts = [] } = useCustomerAccounts(customerId);
  const { data: loans = [] } = useCustomerLoans(customerId, true);
  const { data: cases = [] } = useCustomerCases(customerId, true);

  const totalValue = accounts.reduce((s, a) => s + (a.availableBalance ?? 0), 0) +
    loans.reduce((s, l) => s + (l.outstandingBalance ?? 0), 0);
  const productsHeld = accounts.length + loans.length;
  const openCases = cases.filter((c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;

  const kycDays = customer.kycExpiryDate
    ? Math.ceil((new Date(customer.kycExpiryDate).getTime() - Date.now()) / 86400000)
    : null;

  const items = [
    { label: 'Relationship Value', value: formatMoney(totalValue), highlight: false },
    { label: 'Products', value: String(productsHeld), highlight: false },
    { label: 'Customer Since', value: customer.customerSince ? formatDate(customer.customerSince) : customer.createdAt ? formatDate(customer.createdAt) : '—', highlight: false },
    { label: 'Open Cases', value: String(openCases), highlight: openCases > 0 },
    { label: 'Risk', value: customer.riskRating ?? '—', highlight: customer.riskRating === 'HIGH' || customer.riskRating === 'VERY_HIGH' },
    { label: 'KYC', value: kycDays != null ? (kycDays <= 0 ? 'Expired' : `${kycDays}d left`) : customer.kycStatus ?? '—',
      highlight: kycDays != null && kycDays <= 30 },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'customer-kpi-card',
            item.highlight && 'customer-kpi-card-highlight',
          )}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</div>
          <div className={cn('text-sm font-semibold mt-0.5', item.highlight && 'text-red-600')}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Customer360Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);
  const canViewCases = usePermission('cases', 'view');
  const canViewCommunications = usePermission('communications', 'view');
  const canViewAudit = usePermission('audit', 'view');

  const [showCompose, setShowCompose] = useState(false);

  const { data: customer, isLoading, error } = useCustomer(customerId);
  const { data: accounts = [] } = useCustomerAccounts(customerId);
  const { data: loans = [] } = useCustomerLoans(customerId, true);
  const { data: cards = [] } = useCustomerCards(customerId, true);

  useEffect(() => {
    document.title = customer ? `${customer.fullName} — Customer 360 | CBS` : 'Customer 360 | CBS';
  }, [customer]);

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <div className="h-64 rounded-[28px] bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 rounded-[18px] bg-muted/70 animate-pulse" />
          ))}
        </div>
        <div className="h-[30rem] rounded-[28px] bg-muted/70 animate-pulse" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-container">
        <div className="rounded-xl border p-16 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">Customer not found</p>
          <p className="text-sm text-muted-foreground mt-1">Failed to load customer details.</p>
          <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', content: <CustomerOverviewTab customer={customer} /> },
    { id: 'portfolio', label: 'Portfolio', content: <PortfolioTab customerId={customerId} customerName={customer.fullName} /> },
    { id: 'timeline', label: 'Timeline', content: <CustomerTimeline customerId={customerId} /> },
    { id: 'accounts', label: 'Accounts', badge: accounts.length || undefined, content: <CustomerAccountsTab customerId={customerId} /> },
    { id: 'loans', label: 'Loans', badge: loans.length || undefined, content: <CustomerLoansTab customerId={customerId} customerName={customer.fullName} active /> },
    { id: 'cards', label: 'Cards', badge: cards.length || undefined, content: <CustomerCardsTab customerId={customerId} /> },
    { id: 'documents', label: 'Documents', content: <CustomerDocumentsTab customerId={customerId} active /> },
    { id: 'transactions', label: 'Transactions', content: <CustomerTransactionsTab customerId={customerId} active /> },
    ...(canViewCases ? [{ id: 'cases', label: 'Cases', content: <CustomerCasesTab customerId={customerId} customerName={customer.fullName} active /> }] : []),
    ...(canViewCommunications ? [{ id: 'communications', label: 'Communications', content: <CustomerCommunicationsTab customerId={customerId} active /> }] : []),
    ...(canViewAudit ? [{ id: 'audit', label: 'Audit Trail', content: <CustomerAuditTab customerId={customerId} active /> }] : []),
  ];

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>
        <div className="flex items-center gap-2">
          <div className="customer-hero-chip"><Building2 className="h-3.5 w-3.5 text-primary" /> {customer.branchCode ? `Branch ${customer.branchCode}` : 'No branch'}</div>
          <div className="customer-hero-chip"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> {customer.status}</div>
        </div>
      </div>

      <CustomerHeader customer={customer} accountCount={accounts.length} loanCount={loans.length} cardCount={cards.length} onContactCustomer={() => setShowCompose(true)} />
      {showCompose && <ComposeMessageDialog customer={customer} onClose={() => setShowCompose(false)} />}

      <RelationshipStrip customerId={customerId} customer={customer} />

      <div className="customer-workspace-shell">
        <div className="customer-workspace-banner">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Customer Workspace</p>
              <h2 className="mt-2 text-lg font-semibold">Profile, portfolio, and servicing actions</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Manage relationship insights, active products, documents, communications, and customer servicing from one view.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="customer-hero-chip"><Sparkles className="h-3.5 w-3.5 text-primary" /> {accounts.length + loans.length + cards.length} active products</div>
              <div className="customer-hero-chip">{customer.riskRating ?? 'Unrated'} risk</div>
            </div>
          </div>
        </div>
        <TabsPage tabs={tabs} syncWithUrl />
      </div>
    </div>
  );
}
