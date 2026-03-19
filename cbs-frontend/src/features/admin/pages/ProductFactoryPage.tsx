import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { ProductTable } from '../components/products/ProductTable';
import { BundleBuilder } from '../components/products/BundleBuilder';
import {
  getProducts,
  getBundles,
  createBundle,
  type BankingProduct,
  type ProductBundle,
  type ProductStatus,
} from '../api/productApi';

type TabKey = 'active' | 'draft' | 'retired' | 'bundles';

const TABS: { key: TabKey; label: string; status?: ProductStatus }[] = [
  { key: 'active', label: 'Active Products', status: 'ACTIVE' },
  { key: 'draft', label: 'Draft', status: 'DRAFT' },
  { key: 'retired', label: 'Retired', status: 'RETIRED' },
  { key: 'bundles', label: 'Bundles' },
];

function BundleCard({
  bundle,
  products,
  onEdit,
}: {
  bundle: ProductBundle;
  products: BankingProduct[];
  onEdit: (b: ProductBundle) => void;
}) {
  const bundledProducts = products.filter((p) => bundle.products.includes(p.id));
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{bundle.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              bundle.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600',
            )}
          >
            {bundle.status}
          </span>
          <button
            onClick={() => onEdit(bundle)}
            className="px-3 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{bundle.description}</p>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Included Products</p>
        <div className="flex flex-wrap gap-1.5">
          {bundledProducts.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground font-mono"
            >
              {p.code}
            </span>
          ))}
          {bundledProducts.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No products loaded</span>
          )}
        </div>
      </div>

      {bundle.feeDiscount > 0 && (
        <p className="text-xs text-green-700 font-medium">
          {bundle.feeDiscount}% fee discount for bundle customers
        </p>
      )}
    </div>
  );
}

export function ProductFactoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [showBundleDialog, setShowBundleDialog] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | undefined>(undefined);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  const { data: bundles = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ['product-bundles'],
    queryFn: getBundles,
  });

  const createBundleMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-bundles'] });
      setShowBundleDialog(false);
      setEditingBundle(undefined);
    },
  });

  const filteredProducts = useMemo(() => {
    const currentTab = TABS.find((t) => t.key === activeTab);
    if (!currentTab?.status) return products;
    return products.filter((p) => p.status === currentTab.status);
  }, [products, activeTab]);

  // Stats
  const totalProducts = products.length;
  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const draftCount = products.filter((p) => p.status === 'DRAFT').length;
  const totalAccounts = products.reduce((sum, p) => sum + p.activeAccounts, 0);

  return (
    <>
      <PageHeader
        title="Product Factory"
        subtitle="Design, configure, and manage banking product definitions"
        actions={
          <button
            onClick={() => navigate('/admin/products/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{totalProducts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Products</div>
            <div className="stat-value text-green-700">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Draft Products</div>
            <div className="stat-value text-amber-700">{draftCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Active Accounts</div>
            <div className="stat-value">{totalAccounts.toLocaleString()}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {TABS.map((tab) => {
              const count =
                tab.status
                  ? products.filter((p) => p.status === tab.status).length
                  : bundles.length;
              return (
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
                  <span
                    className={cn(
                      'ml-2 px-1.5 py-0.5 rounded text-xs',
                      activeTab === tab.key
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab !== 'bundles' && (
          <>
            {productsLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">Loading products…</p>
              </div>
            ) : (
              <ProductTable
                products={filteredProducts}
                onRowClick={(id) => navigate(`/admin/products/${id}`)}
              />
            )}
          </>
        )}

        {activeTab === 'bundles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {bundles.length} bundle{bundles.length !== 1 ? 's' : ''} defined
              </p>
              <button
                onClick={() => {
                  setEditingBundle(undefined);
                  setShowBundleDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Bundle
              </button>
            </div>

            {bundlesLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <p className="text-sm">Loading bundles…</p>
              </div>
            ) : bundles.length === 0 ? (
              <div className="bg-card rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No bundles defined yet</p>
                <p className="text-xs mt-1">Create your first product bundle to offer discounted packages.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundles.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    products={products}
                    onEdit={(b) => {
                      setEditingBundle(b);
                      setShowBundleDialog(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bundle Dialog */}
      {showBundleDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">
                {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
              </h2>
              <button
                onClick={() => {
                  setShowBundleDialog(false);
                  setEditingBundle(undefined);
                }}
                className="p-1 rounded hover:bg-muted/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <BundleBuilder
                products={products}
                bundle={editingBundle}
                onSave={(data) => createBundleMutation.mutate(data)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
