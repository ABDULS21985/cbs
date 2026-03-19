import { useState } from 'react';
import { Save, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankingProduct, ProductBundle } from '../../api/productApi';

interface BundleBuilderProps {
  products: BankingProduct[];
  bundle?: ProductBundle;
  onSave: (bundle: Partial<ProductBundle>) => void;
}

export function BundleBuilder({ products, bundle, onSave }: BundleBuilderProps) {
  const [name, setName] = useState(bundle?.name ?? '');
  const [description, setDescription] = useState(bundle?.description ?? '');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(bundle?.products ?? []);
  const [feeDiscount, setFeeDiscount] = useState(bundle?.feeDiscount ?? 0);
  const [isSaving, setIsSaving] = useState(false);

  const activeProducts = products.filter((p) => p.status === 'ACTIVE');

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const selectedProducts = activeProducts.filter((p) => selectedProductIds.includes(p.id));

  const previewText =
    selectedProducts.length === 0
      ? 'Select products to see the bundle preview.'
      : `This bundle includes: ${selectedProducts.map((p) => p.name).join(' + ')}${feeDiscount > 0 ? ` with ${feeDiscount}% fee discount` : ''}.`;

  const handleSave = async () => {
    if (!name.trim() || selectedProductIds.length === 0) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSaving(false);
    onSave({
      id: bundle?.id,
      name: name.trim(),
      description: description.trim(),
      products: selectedProductIds,
      feeDiscount,
      status: 'ACTIVE',
    });
  };

  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Package className="w-4 h-4" />
        {bundle ? 'Edit Bundle' : 'Create New Bundle'}
      </div>

      {/* Name and Description */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Bundle Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Starter Banking Package"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this bundle offers..."
            className={cn(inputCls, 'resize-none')}
          />
        </div>
      </div>

      {/* Product Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Products
          <span className="text-muted-foreground font-normal ml-1">({selectedProductIds.length} selected)</span>
        </label>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
          {activeProducts.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">No active products available.</p>
          )}
          {activeProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            return (
              <label
                key={product.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted/20',
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleProduct(product.id)}
                  className="accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{product.type}</p>
                  <p className="text-xs font-medium">{product.activeAccounts.toLocaleString()} accs</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Fee Discount */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Fee Discount (%)
          <span className="text-muted-foreground font-normal ml-1">applied to all linked fees in bundled products</span>
        </label>
        <div className="relative max-w-[180px]">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={feeDiscount}
            onChange={(e) => setFeeDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
            className={cn(inputCls, 'pr-8')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bundle Preview</p>
        <p className="text-sm text-foreground">{previewText}</p>
        {selectedProducts.length > 0 && feeDiscount > 0 && (
          <p className="text-xs text-green-700 mt-1">
            Customers will save {feeDiscount}% on all mandatory fees across bundled products.
          </p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || selectedProductIds.length === 0 || isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving…' : 'Save Bundle'}
        </button>
      </div>
    </div>
  );
}
