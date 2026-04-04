import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Edit2, Send, Archive, AlertTriangle, Copy, Check, X, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { ProductPerformanceTab } from '../components/products/ProductPerformanceTab';
import { IslamicProductConfigStep } from '../components/products/IslamicProductConfigStep';
import { ProductVersionDiff } from '../components/products/ProductVersionDiff';
import { EligibilityRuleBuilder } from '../components/products/EligibilityRuleBuilder';
import { LimitsControlsStep } from '../components/products/LimitsControlsStep';
import { RateTierEditor } from '../components/products/RateTierEditor';
import { FeeLinkageStep } from '../components/products/FeeLinkageStep';
import {
  activateIslamicProduct,
  approveIslamicProduct,
  getIslamicProductByCode,
  getIslamicProductHistory,
  linkFatwaToIslamicProduct,
  retireIslamicProduct,
  submitIslamicProductForApproval,
  suspendIslamicProduct,
  unlinkFatwaFromIslamicProduct,
  updateIslamicProduct,
} from '../api/islamicProductApi';
import {
  getProductById,
  getProductVersions,
  publishProduct,
  retireProduct,
  updateProduct,
  type BankingProduct,
  type ProductStatus,
  type ProductType,
} from '../api/productApi';
import {
  formatIslamicProfitDisplay,
  mapIslamicProductToDraft,
  sanitizeIslamicDraft,
  toCommaSeparated,
} from '../lib/islamicProductMapper';
import type { IslamicProduct, IslamicProductStatus, ShariahComplianceStatus } from '../types/islamicProduct';

type DetailTab = 'configuration' | 'shariah' | 'performance' | 'accounts' | 'amendments';

const TYPE_LABELS: Record<ProductType, string> = {
  SAVINGS: 'Savings', CURRENT: 'Current', FIXED_DEPOSIT: 'Fixed Deposit',
  LOAN: 'Loan', CARD: 'Card', INVESTMENT: 'Investment',
};

const TYPE_COLORS: Record<ProductType, string> = {
  SAVINGS: 'bg-blue-100 text-blue-800', CURRENT: 'bg-indigo-100 text-indigo-800',
  FIXED_DEPOSIT: 'bg-purple-100 text-purple-800', LOAN: 'bg-orange-100 text-orange-800',
  CARD: 'bg-pink-100 text-pink-800', INVESTMENT: 'bg-teal-100 text-teal-800',
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800', DRAFT: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-gray-100 text-gray-600',
};

const ISLAMIC_STATUS_COLORS: Record<IslamicProductStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-sky-100 text-sky-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  RETIRED: 'bg-gray-100 text-gray-600',
};

const SHARIAH_COLORS: Record<ShariahComplianceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_FATWA: 'bg-amber-100 text-amber-800',
  FATWA_ISSUED: 'bg-sky-100 text-sky-800',
  COMPLIANT: 'bg-emerald-100 text-emerald-800',
  NON_COMPLIANT: 'bg-rose-100 text-rose-800',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  RETIRED: 'bg-gray-100 text-gray-600',
};

// ── Inline Edit Section ──────────────────────────────────────────────────────

function EditableSection({
  title,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving,
  children,
  editContent,
}: {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  children: React.ReactNode;
  editContent: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={onSave} disabled={isSaving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>
      {isEditing ? editContent : children}
    </div>
  );
}

// ── Configuration Tab ────────────────────────────────────────────────────────

function ConfigurationTab({ product, onUpdate }: { product: BankingProduct; onUpdate: (data: Partial<BankingProduct>) => void }) {
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<BankingProduct>>({});
  const [isSaving, setIsSaving] = useState(false);

  const qc = useQueryClient();
  const updateMut = useMutation({
    mutationFn: (data: Partial<BankingProduct>) => updateProduct(product.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', product.id] });
      setEditSection(null);
      setIsSaving(false);
    },
    onError: () => setIsSaving(false),
  });

  const startEdit = (section: string) => {
    setEditData({ ...product });
    setEditSection(section);
  };

  const saveEdit = () => {
    setIsSaving(true);
    updateMut.mutate(editData);
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

  const interestTypeLabel: Record<string, string> = {
    FLAT: 'Flat Rate', REDUCING_BALANCE: 'Reducing Balance',
    COMPOUND: 'Compound', TIERED: 'Tiered', NONE: 'Non-interest',
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <EditableSection
        title="Basic Information"
        isEditing={editSection === 'basic'}
        onEdit={() => startEdit('basic')}
        onSave={saveEdit}
        onCancel={() => setEditSection(null)}
        isSaving={isSaving}
        editContent={
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Product Name</label>
                <input value={editData.name ?? ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Short Description</label>
                <input value={editData.shortDescription ?? ''} onChange={(e) => setEditData({ ...editData, shortDescription: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Long Description</label>
              <textarea rows={3} value={editData.longDescription ?? ''} onChange={(e) => setEditData({ ...editData, longDescription: e.target.value })} className={cn(inputCls, 'resize-none')} />
            </div>
          </div>
        }
      >
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
        {product.shortDescription && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Short Description</p>
            <p className="text-sm">{product.shortDescription}</p>
          </div>
        )}
        {product.longDescription && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">Full Description</p>
            <p className="text-sm text-muted-foreground">{product.longDescription}</p>
          </div>
        )}
      </EditableSection>

      {/* Interest/Rate Config */}
      <EditableSection
        title="Interest & Rate"
        isEditing={editSection === 'interest'}
        onEdit={() => startEdit('interest')}
        onSave={saveEdit}
        onCancel={() => setEditSection(null)}
        isSaving={isSaving}
        editContent={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Interest Rate (% p.a.)</label>
              <input type="number" step="0.01" value={editData.interestRate ?? 0} onChange={(e) => setEditData({ ...editData, interestRate: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Penalty Rate (%)</label>
              <input type="number" step="0.01" value={editData.penaltyRate ?? ''} onChange={(e) => setEditData({ ...editData, penaltyRate: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} />
            </div>
          </div>
        }
      >
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
      </EditableSection>

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

// ── Accounts Tab ─────────────────────────────────────────────────────────────

interface ProductAccount {
  id: string;
  number: string;
  customer: string;
  balance: number;
  status: string;
  opened: string;
}

function AccountsTab({ product }: { product: BankingProduct }) {
  const navigate = useNavigate();
  const {
    data: accounts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product-accounts', product.id],
    queryFn: () => apiGet<ProductAccount[]>(`/api/v1/products/${product.id}/accounts`),
  });

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
          Showing {accounts.length} accounts (of {(product.activeAccounts || 0).toLocaleString()} total)
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
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading accounts...</td></tr>
            ) : isError ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-destructive">Product accounts could not be loaded from the backend.</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No accounts found for this product.</td></tr>
            ) : accounts.map((acc) => (
              <tr
                key={acc.id}
                onClick={() => navigate(`/accounts/${acc.number}`)}
                className="hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium">{acc.number}</span>
                </td>
                <td className="px-4 py-3 font-medium">{acc.customer}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  ₦{acc.balance.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    accountStatusColors[acc.status] ?? 'bg-gray-100 text-gray-600',
                  )}>
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

function ShariahTab({ product, islamicProduct }: { product: BankingProduct; islamicProduct: IslamicProduct }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftProduct, setDraftProduct] = useState<Partial<BankingProduct>>({
    ...product,
    islamicConfig: mapIslamicProductToDraft(islamicProduct),
  });
  const [fatwaInput, setFatwaInput] = useState(islamicProduct.activeFatwaId ? String(islamicProduct.activeFatwaId) : '');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    setDraftProduct({
      ...product,
      islamicConfig: mapIslamicProductToDraft(islamicProduct),
    });
    setFatwaInput(islamicProduct.activeFatwaId ? String(islamicProduct.activeFatwaId) : '');
  }, [product, islamicProduct]);

  const updateMutation = useMutation({
    mutationFn: () => updateIslamicProduct(islamicProduct.id, sanitizeIslamicDraft(draftProduct.islamicConfig ?? {})),
    onSuccess: async () => {
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitIslamicProductForApproval(islamicProduct.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveIslamicProduct(islamicProduct.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => activateIslamicProduct(islamicProduct.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
      await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendIslamicProduct(islamicProduct.id, actionReason || undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
      await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setActionReason('');
    },
  });

  const retireMutation = useMutation({
    mutationFn: () => retireIslamicProduct(islamicProduct.id, actionReason || undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
      await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setActionReason('');
    },
  });

  const linkFatwaMutation = useMutation({
    mutationFn: () => linkFatwaToIslamicProduct(islamicProduct.id, Number(fatwaInput)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
    },
  });

  const unlinkFatwaMutation = useMutation({
    mutationFn: () => unlinkFatwaFromIslamicProduct(islamicProduct.id, actionReason || undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['islamic-product', product.code] });
      setFatwaInput('');
      setActionReason('');
    },
  });

  const currentDraft = draftProduct.islamicConfig ?? mapIslamicProductToDraft(islamicProduct);
  const isBusy = updateMutation.isPending || submitMutation.isPending || approveMutation.isPending || activateMutation.isPending || suspendMutation.isPending || retireMutation.isPending || linkFatwaMutation.isPending || unlinkFatwaMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card border-emerald-200/60 bg-emerald-50/70">
          <div className="stat-label">Contract Type</div>
          <div className="stat-value text-emerald-900 text-xl">{islamicProduct.contractTypeCode}</div>
          <div className="text-xs text-muted-foreground mt-1">{islamicProduct.contractTypeName}</div>
        </div>
        <div className="stat-card border-sky-200/60 bg-sky-50/70">
          <div className="stat-label">Compliance</div>
          <div className="stat-value text-sky-900 text-xl">{islamicProduct.shariahComplianceStatus}</div>
          <div className="text-xs text-muted-foreground mt-1">{islamicProduct.hasActiveFatwa ? 'Active fatwa linked' : 'Fatwa still required'}</div>
        </div>
        <div className="stat-card border-amber-200/60 bg-amber-50/70">
          <div className="stat-label">Lifecycle</div>
          <div className="stat-value text-amber-900 text-xl">{islamicProduct.status}</div>
          <div className="text-xs text-muted-foreground mt-1">Version {islamicProduct.productVersion}</div>
        </div>
        <div className="stat-card border-violet-200/60 bg-violet-50/70">
          <div className="stat-label">Profit Model</div>
          <div className="stat-value text-violet-900 text-lg">{formatIslamicProfitDisplay(islamicProduct)}</div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-semibold">Lifecycle Controls</h3>
            <p className="text-xs text-muted-foreground mt-1">Operate the Islamic extension lifecycle with fatwa enforcement.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(islamicProduct.status === 'DRAFT' || (islamicProduct.status === 'SUSPENDED' && !islamicProduct.hasActiveFatwa)) && (
              <button onClick={() => submitMutation.mutate()} disabled={isBusy} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                Submit for Approval
              </button>
            )}
            {islamicProduct.status === 'PENDING_APPROVAL' && (
              <button onClick={() => approveMutation.mutate()} disabled={isBusy} className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50">
                Approve
              </button>
            )}
            {(islamicProduct.status === 'APPROVED' || (islamicProduct.status === 'SUSPENDED' && islamicProduct.hasActiveFatwa)) && (
              <button onClick={() => activateMutation.mutate()} disabled={isBusy} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                Activate
              </button>
            )}
            {islamicProduct.status === 'ACTIVE' && (
              <>
                <button onClick={() => suspendMutation.mutate()} disabled={isBusy} className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50">
                  Suspend
                </button>
                <button onClick={() => retireMutation.mutate()} disabled={isBusy} className="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50">
                  Retire
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Action Note / Reason</label>
          <input
            type="text"
            value={actionReason}
            onChange={(event) => setActionReason(event.target.value)}
            placeholder="Used for suspend, retire, or fatwa unlink actions"
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-semibold">Fatwa Linkage</h3>
            <p className="text-xs text-muted-foreground mt-1">Link or unlink the governing fatwa without leaving the product detail flow.</p>
          </div>
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', SHARIAH_COLORS[islamicProduct.shariahComplianceStatus])}>
            {islamicProduct.shariahComplianceStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Current Fatwa</label>
            <div className="rounded-lg border border-border px-3 py-2 text-sm bg-muted/20">
              {islamicProduct.fatwaReference ?? 'No linked fatwa'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Fatwa ID</label>
            <input
              type="number"
              min={1}
              value={fatwaInput}
              onChange={(event) => setFatwaInput(event.target.value)}
              placeholder="Enter fatwa ID"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => linkFatwaMutation.mutate()}
              disabled={isBusy || !fatwaInput.trim()}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Link Fatwa
            </button>
            {islamicProduct.activeFatwaId && (
              <button
                onClick={() => unlinkFatwaMutation.mutate()}
                disabled={isBusy}
                className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                Unlink
              </button>
            )}
          </div>
        </div>
      </div>

      <EditableSection
        title="Shariah Configuration"
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={() => updateMutation.mutate()}
        onCancel={() => {
          setDraftProduct({ ...product, islamicConfig: mapIslamicProductToDraft(islamicProduct) });
          setIsEditing(false);
        }}
        isSaving={updateMutation.isPending}
        editContent={
          <div className="space-y-4">
            <IslamicProductConfigStep product={draftProduct} onChange={setDraftProduct} />
            <div>
              <label className="block text-sm font-medium mb-1.5">Change Description</label>
              <input
                type="text"
                value={currentDraft.changeDescription ?? ''}
                onChange={(event) =>
                  setDraftProduct((previous) => ({
                    ...previous,
                    islamicConfig: {
                      ...currentDraft,
                      changeDescription: event.target.value,
                    },
                  }))
                }
                placeholder="Describe the material or non-material change"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Arabic Name</p>
            <div className="font-medium">{islamicProduct.nameAr}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Contract Type</p>
            <div className="font-medium">{islamicProduct.contractTypeName}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Product Category</p>
            <div className="font-medium">{islamicProduct.productCategory}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Profit Method</p>
            <div className="font-medium">{formatIslamicProfitDisplay(islamicProduct)}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Currencies</p>
            <div className="font-medium">{toCommaSeparated(islamicProduct.currencies)}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Customer Types</p>
            <div className="font-medium">{toCommaSeparated(islamicProduct.eligibleCustomerTypes)}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Rule Group</p>
            <div className="font-medium">{islamicProduct.shariahRuleGroupCode ?? '—'}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Last Review</p>
            <div className="font-medium">{islamicProduct.lastShariahReviewDate ?? '—'}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Next Review</p>
            <div className="font-medium">{islamicProduct.nextShariahReviewDate ?? '—'}</div>
          </div>
        </div>

        {islamicProduct.applicableShariahRules.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Applicable Shariah Rules</p>
            <div className="flex flex-wrap gap-2">
              {islamicProduct.applicableShariahRules.map((rule) => (
                <span key={rule} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground font-mono">
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}
      </EditableSection>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

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

  const isIslamicCategory = product?.category === 'ISLAMIC';

  const {
    data: islamicProduct,
    error: islamicProductError,
  } = useQuery({
    queryKey: ['islamic-product', product?.code],
    queryFn: () => getIslamicProductByCode(product!.code),
    enabled: !!product?.code && isIslamicCategory,
    retry: false,
  });

  const {
    data: islamicHistory = [],
    isError: islamicHistoryError,
  } = useQuery({
    queryKey: ['islamic-product-history', islamicProduct?.id],
    queryFn: () => getIslamicProductHistory(islamicProduct!.id),
    enabled: !!islamicProduct?.id,
    retry: false,
  });

  const {
    data: versions = [],
    isError: versionsError,
  } = useQuery({
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

  const DETAIL_TABS: { key: DetailTab; label: string }[] = useMemo(() => {
    const tabs: { key: DetailTab; label: string }[] = [{ key: 'configuration', label: 'Configuration' }];
    if (isIslamicCategory) {
      tabs.push({ key: 'shariah', label: 'Shariah' });
    }
    tabs.push(
      { key: 'performance', label: 'Performance' },
      { key: 'accounts', label: 'Accounts' },
      { key: 'amendments', label: 'Amendments' },
    );
    return tabs;
  }, [isIslamicCategory]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/admin/products" />
        <div className="page-container flex items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">Loading product details...</p>
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
              onClick={() => navigate(`/admin/products/new?clone=${id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Clone
            </button>
            {!isIslamicCategory && product.status === 'DRAFT' && (
              <button
                onClick={() => setConfirmAction('publish')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            )}
            {!isIslamicCategory && product.status === 'ACTIVE' && (
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
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', TYPE_COLORS[product.type])}>
            {TYPE_LABELS[product.type]}
          </span>
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', STATUS_COLORS[product.status])}>
            {product.status}
          </span>
          {islamicProduct && (
            <>
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', ISLAMIC_STATUS_COLORS[islamicProduct.status])}>
                {islamicProduct.status}
              </span>
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold', SHARIAH_COLORS[islamicProduct.shariahComplianceStatus])}>
                {islamicProduct.shariahComplianceStatus}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {islamicProduct.hasActiveFatwa ? islamicProduct.fatwaReference ?? 'Fatwa Active' : 'Fatwa Pending'}
              </span>
            </>
          )}
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
        {activeTab === 'configuration' && (
          <ConfigurationTab
            product={product}
            onUpdate={(data) => queryClient.invalidateQueries({ queryKey: ['product', id] })}
          />
        )}
        {activeTab === 'shariah' && (
          islamicProduct ? (
            <ShariahTab product={product} islamicProduct={islamicProduct} />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {islamicProductError
                ? 'The product is marked Islamic in the catalogue, but its Shariah extension could not be loaded.'
                : 'Loading Islamic product extension...'}
            </div>
          )
        )}
        {activeTab === 'performance' && <ProductPerformanceTab product={product} />}
        {activeTab === 'accounts' && <AccountsTab product={product} />}
        {activeTab === 'amendments' && (
          islamicProduct ? (
            islamicHistoryError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Islamic product version history could not be loaded from the backend.
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Version</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Change Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Changed By</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Changed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {islamicHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No Islamic product history has been recorded yet.
                        </td>
                      </tr>
                    ) : (
                      islamicHistory.map((version) => (
                        <tr key={version.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">v{version.versionNumber}</td>
                          <td className="px-4 py-3">{version.changeType}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{version.changeDescription}</div>
                            {version.changedFields.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground font-mono">
                                {version.changedFields.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{version.changedBy}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(version.changedAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            versionsError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Product version history could not be loaded from the backend.
              </div>
            ) : (
              <ProductVersionDiff versions={versions} />
            )
          )
        )}
      </div>

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-sm shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                confirmAction === 'publish' ? 'bg-green-100' : 'bg-amber-100',
              )}>
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
                    : `"${product.name}" will be retired. ${product.activeAccounts ? `${product.activeAccounts} existing accounts are not affected.` : 'No existing accounts affected.'}`}
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
                  ? 'Processing...'
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
