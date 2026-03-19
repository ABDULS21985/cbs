import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Send, Archive, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { ProductPerformanceTab } from '../components/products/ProductPerformanceTab';
import { ProductVersionDiff } from '../components/products/ProductVersionDiff';
import { EligibilityRuleBuilder } from '../components/products/EligibilityRuleBuilder';
import { LimitsControlsStep } from '../components/products/LimitsControlsStep';
import { RateTierEditor } from '../components/products/RateTierEditor';
import { FeeLinkageStep } from '../components/products/FeeLinkageStep';
import {
  getProductById,
  getProductVersions,
  publishProduct,
  retireProduct,
  type BankingProduct,
  type ProductStatus,
  type ProductType,
} from '../api/productApi';

type DetailTab = 'configuration' | 'performance' | 'accounts' | 'amendments';

// ─── Mock Accounts ────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  { id: 'acc-001', number: '0123456789', customer: 'Amara Okonkwo', balance: 450000, status: 'ACTIVE', opened: '2022-03-10' },
  { id: 'acc-002', number: '0234567890', customer: 'TechVentures Nigeria Ltd', balance: 12500000, status: 'ACTIVE', opened: '2022-05-20' },
  { id: 'acc-003', number: '0345678901', customer: 'Ibrahim Musa', balance: 89000, status: 'ACTIVE', opened: '2022-07-01' },
  { id: 'acc-004', number: '0456789012', customer: 'Chidi Enterprises', balance: 3200000, status: 'DORMANT', opened: '2022-08-14' },
  { id: 'acc-005', number: '0567890123', customer: 'Fatima Al-Hassan', balance: 750000, status: 'ACTIVE', opened: '2022-09-05' },
  { id: 'acc-006', number: '0678901234', customer: 'Emeka Nwosu', balance: 220000, status: 'ACTIVE', opened: '2022-10-18' },
  { id: 'acc-007', number: '0789012345', customer: 'Ngozi Eze', balance: 5600000, status: 'ACTIVE', opened: '2023-01-12' },
  { id: 'acc-008', number: '0890123456', customer: 'Bola Adeyemi', balance: 140000, status: 'RESTRICTED', opened: '2023-03-22' },
];

const TYPE_LABELS: Record<ProductType, string> = {
  SAVINGS: 'Savings',
  CURRENT: 'Current',
  FIXED_DEPOSIT: 'Fixed Deposit',
  LOAN: 'Loan',
  CARD: 'Card',
  INVESTMENT: 'Investment',
};

const TYPE_COLORS: Record<ProductType, string> = {
  SAVINGS: 'bg-blue-100 text-blue-800',
  CURRENT: 'bg-indigo-100 text-indigo-800',
  FIXED_DEPOSIT: 'bg-purple-100 text-purple-800',
  LOAN: 'bg-orange-100 text-orange-800',
  CARD: 'bg-pink-100 text-pink-800',
  INVESTMENT: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-gray-100 text-gray-600',
};

// ─── Configuration Tab ────────────────────────────────────────────────────────

function ConfigurationTab({ product }: { product: BankingProduct }) {
  const interestTypeLabel: Record<string, string> = {
    FLAT: 'Flat Rate',
    REDUCING_BALANCE: 'Reducing Balance',
    COMPOUND: 'Compound',
    TIERED: 'Tiered',
    NONE: 'Non-interest',
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Product Code', value: <span className="font-mono text-xs">{product.code}</span> },
            { label: 'Product Name', value: product.name },
            { label: 'Type', value: TYPE_LABELS[product.type] },
            { label: 'Category', value: product.category },
            { label: 'Currency', value: product.currency },
            { label: 'Version', value: `v${product.version}` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <div className="font-medium">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Short Description</p>
          <p className="text-sm">{product.shortDescription}</p>
        </div>
        {product.longDescription && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">Full Description</p>
            <p className="text-sm text-muted-foreground">{product.longDescription}</p>
          </div>
        )}
      </div>

      {/* Interest/Rate Config */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Interest & Rate</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Interest Type</p>
            <p className="font-medium">{interestTypeLabel[product.interestType] ?? product.interestType}</p>
          </div>
          {product.interestRate != null && product.interestType !== 'TIERED' && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Annual Rate</p>
              <p className="font-medium">{product.interestRate}%</p>
            </div>
          )}
          {product.penaltyRate != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Penalty Rate</p>
              <p className="font-medium">{product.penaltyRate}%</p>
            </div>
          )}
        </div>
        {product.interestType === 'TIERED' && product.rateTiers && (
          <RateTierEditor tiers={product.rateTiers} onChange={() => {}} readOnly />
        )}
      </div>

      {/* Fee Linkage */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Linked Fees</h3>
        <FeeLinkageStep linkedFees={product.linkedFees} onChange={() => {}} />
      </div>

      {/* Eligibility */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Eligibility Rules</h3>
        <EligibilityRuleBuilder rules={product.eligibility} onChange={() => {}} readOnly />
      </div>

      {/* Limits */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-border">Limits & Controls</h3>
        <LimitsControlsStep limits={product.limits} onChange={() => {}} readOnly />
      </div>
    </div>
  );
}

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab({ product }: { product: BankingProduct }) {
  const accountStatusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DORMANT: 'bg-amber-100 text-amber-800',
    RESTRICTED: 'bg-red-100 text-red-800',
    CLOSED: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {MOCK_ACCOUNTS.length} sample accounts (of {product.activeAccounts.toLocaleString()} total)
        </p>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account No.</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_ACCOUNTS.map((acc) => (
              <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium">{acc.number}</span>
                </td>
                <td className="px-4 py-3 font-medium">{acc.customer}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  ₦{acc.balance.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      accountStatusColors[acc.status] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {acc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{acc.opened}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>('configuration');
  const [confirmAction, setConfirmAction] = useState<'publish' | 'retire' | null>(null);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['product-versions', id],
    queryFn: () => getProductVersions(id!),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => publishProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setConfirmAction(null);
    },
  });

  const retireMutation = useMutation({
    mutationFn: () => retireProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setConfirmAction(null);
    },
  });

  const DETAIL_TABS: { key: DetailTab; label: string }[] = [
    { key: 'configuration', label: 'Configuration' },
    { key: 'performance', label: 'Performance' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'amendments', label: 'Amendments' },
  ];

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading…" backTo="/admin/products" />
        <div className="page-container flex items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">Loading product details…</p>
        </div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <PageHeader title="Product Not Found" backTo="/admin/products" />
        <div className="page-container">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm font-medium text-destructive">Product could not be loaded</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        backTo="/admin/products"
        subtitle={product.shortDescription}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/products/${id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            {product.status === 'DRAFT' && (
              <button
                onClick={() => setConfirmAction('publish')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            )}
            {product.status === 'ACTIVE' && (
              <button
                onClick={() => setConfirmAction('retire')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <Archive className="w-4 h-4" />
                Retire
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Status badges */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold',
              TYPE_COLORS[product.type],
            )}
          >
            {TYPE_LABELS[product.type]}
          </span>
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold',
              STATUS_COLORS[product.status],
            )}
          >
            {product.status}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-muted text-muted-foreground font-mono">
            v{product.version}
          </span>
          <span className="text-xs text-muted-foreground ml-1 font-mono">{product.code}</span>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'configuration' && <ConfigurationTab product={product} />}
        {activeTab === 'performance' && <ProductPerformanceTab product={product} />}
        {activeTab === 'accounts' && <AccountsTab product={product} />}
        {activeTab === 'amendments' && <ProductVersionDiff versions={versions} />}
      </div>

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  confirmAction === 'publish' ? 'bg-green-100' : 'bg-amber-100',
                )}
              >
                {confirmAction === 'publish' ? (
                  <Send className="w-5 h-5 text-green-700" />
                ) : (
                  <Archive className="w-5 h-5 text-amber-700" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  {confirmAction === 'publish' ? 'Publish Product' : 'Retire Product'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {confirmAction === 'publish'
                    ? `"${product.name}" will be published and available for new account openings.`
                    : `"${product.name}" will be retired and no longer available for new accounts. Existing accounts are not affected.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'publish') publishMutation.mutate();
                  else retireMutation.mutate();
                }}
                disabled={publishMutation.isPending || retireMutation.isPending}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                  confirmAction === 'publish'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700',
                )}
              >
                {publishMutation.isPending || retireMutation.isPending
                  ? 'Processing…'
                  : confirmAction === 'publish'
                  ? 'Yes, Publish'
                  : 'Yes, Retire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
