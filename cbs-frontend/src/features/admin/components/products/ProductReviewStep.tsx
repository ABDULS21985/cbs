import { CheckCircle, Send, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankingProduct, InterestType } from '../../api/productApi';
import { formatIslamicProfitDisplay } from '../../lib/islamicProductMapper';

// Comparison products for side-by-side
const COMPARISON_PRODUCTS = [
  {
    name: 'Classic Savings Account',
    code: 'SAV-CLASSIC-001',
    interestRate: '1.5–4.5% (tiered)',
    minBalance: '₦1,000',
    accounts: '42,350',
    revenueMTD: '₦21.2M',
  },
  {
    name: 'Murabaha Savings Account',
    code: 'ISL-SAV-001',
    interestRate: '4.0% flat',
    minBalance: '₦5,000',
    accounts: '3,410',
    revenueMTD: '₦2.8M',
  },
];

interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
}
function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h4 className="text-sm font-semibold mb-3 pb-2 border-b border-border">{title}</h4>
      {children}
    </div>
  );
}

function interestLabel(type: InterestType | undefined): string {
  const labels: Record<InterestType, string> = {
    FLAT: 'Flat Rate',
    REDUCING_BALANCE: 'Reducing Balance',
    COMPOUND: 'Compound',
    TIERED: 'Tiered',
    NONE: 'Non-interest',
  };
  return type ? labels[type] : '—';
}

interface ProductReviewStepProps {
  product: Partial<BankingProduct>;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function ProductReviewStep({ product, onSaveDraft, onPublish }: ProductReviewStepProps) {
  const limits = product.limits;
  const eligibility = product.eligibility;

  return (
    <div className="space-y-6">
      {/* Header notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          Review all settings carefully. Once published, this product will be available for account opening.
          {product.category === 'ISLAMIC'
            ? ' Islamic products are still created as controlled drafts and move into approval and fatwa workflows before activation.'
            : ' You can still edit and publish a new version after publishing.'}
        </p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <SectionCard title="Basic Information">
          <SummaryRow label="Product Code" value={<span className="font-mono text-xs">{product.code ?? '—'}</span>} />
          <SummaryRow label="Name" value={product.name ?? '—'} />
          <SummaryRow label="Type" value={product.type ?? '—'} />
          <SummaryRow label="Category" value={product.category ?? '—'} />
          <SummaryRow label="Currency" value={product.currency ?? '—'} />
        </SectionCard>

        {/* Interest / Rate */}
        <SectionCard title="Interest & Rate">
          <SummaryRow label="Interest Type" value={interestLabel(product.interestType)} />
          {product.interestType !== 'NONE' && product.interestType !== 'TIERED' && (
            <SummaryRow label="Rate" value={product.interestRate != null ? `${product.interestRate}%` : '—'} />
          )}
          {product.interestType === 'TIERED' && (
            <SummaryRow
              label="Tiers"
              value={`${product.rateTiers?.length ?? 0} tier${(product.rateTiers?.length ?? 0) !== 1 ? 's' : ''} defined`}
            />
          )}
          {product.penaltyRate != null && (
            <SummaryRow label="Penalty Rate" value={`${product.penaltyRate}%`} />
          )}
        </SectionCard>

        {product.category === 'ISLAMIC' && product.islamicConfig && (
          <SectionCard title="Shariah Configuration">
            <SummaryRow label="Arabic Name" value={product.islamicConfig.nameAr ?? '—'} />
            <SummaryRow label="Contract Type" value={product.islamicConfig.contractTypeName ?? product.islamicConfig.contractTypeCode ?? '—'} />
            <SummaryRow label="Islamic Category" value={product.islamicConfig.productCategory ?? '—'} />
            <SummaryRow label="Profit Model" value={formatIslamicProfitDisplay(product.islamicConfig)} />
            <SummaryRow label="Fatwa Required" value={product.islamicConfig.fatwaRequired === false ? 'No' : 'Yes'} />
            <SummaryRow label="Fatwa ID" value={product.islamicConfig.fatwaId ?? 'To be linked later'} />
            <SummaryRow label="Rule Group" value={product.islamicConfig.shariahRuleGroupCode ?? '—'} />
          </SectionCard>
        )}

        {/* Eligibility */}
        <SectionCard title="Eligibility">
          <SummaryRow label="Customer Type" value={eligibility?.customerType ?? '—'} />
          {eligibility?.minimumAge && (
            <SummaryRow label="Min. Age" value={`${eligibility.minimumAge} years`} />
          )}
          <SummaryRow label="KYC Level" value={`Level ${eligibility?.kycLevel ?? '—'}+`} />
          <SummaryRow
            label="Min. Opening Balance"
            value={
              eligibility?.minimumOpeningBalance != null
                ? `₦${eligibility.minimumOpeningBalance.toLocaleString()}`
                : '—'
            }
          />
          <SummaryRow label="Segment" value={eligibility?.segment ?? '—'} />
          <SummaryRow
            label="Existing Product"
            value={eligibility?.existingProductRequired ?? 'None required'}
          />
          <SummaryRow label="Geographic Scope" value={eligibility?.geographicScope ?? '—'} />
        </SectionCard>

        {/* Limits */}
        <SectionCard title="Key Limits">
          <SummaryRow
            label="Daily Debit Limit"
            value={limits?.dailyDebitLimit != null ? `₦${limits.dailyDebitLimit.toLocaleString()}` : '—'}
          />
          <SummaryRow
            label="Per-Transaction Limit"
            value={limits?.perTransactionLimit != null ? `₦${limits.perTransactionLimit.toLocaleString()}` : '—'}
          />
          <SummaryRow
            label="Min. Balance"
            value={limits?.minimumBalance != null ? `₦${limits.minimumBalance.toLocaleString()}` : '—'}
          />
          <SummaryRow
            label="Overdraft"
            value={
              limits?.overdraftAllowed
                ? `Allowed (₦${(limits.overdraftLimit ?? 0).toLocaleString()})`
                : 'Not allowed'
            }
          />
          <SummaryRow
            label="Channels"
            value={
              limits?.channels?.length
                ? limits.channels.join(', ')
                : '—'
            }
          />
        </SectionCard>

        {/* Linked Fees */}
        <SectionCard title="Linked Fees">
          {!product.linkedFees?.length ? (
            <p className="text-sm text-muted-foreground">No fees linked.</p>
          ) : (
            product.linkedFees.map((fee) => (
              <SummaryRow
                key={fee.feeId}
                label={fee.feeName}
                value={
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">₦{fee.amount.toLocaleString()}</span>
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                        fee.mandatory
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {fee.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </div>
                }
              />
            ))
          )}
        </SectionCard>
      </div>

      {/* Side-by-side comparison with similar products */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Comparison with Similar Products</h3>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Interest Rate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Min. Balance</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Active Accounts</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue MTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Current product being created */}
              <tr className="bg-primary/5">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold">{product.name ?? 'This Product'}</p>
                    <p className="text-xs font-mono text-muted-foreground">{product.code ?? 'NEW'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-primary font-medium">
                  {product.interestType === 'NONE'
                    ? 'Non-interest'
                    : product.interestType === 'TIERED'
                    ? `${product.rateTiers?.[0]?.rate ?? 0}–${product.rateTiers?.[product.rateTiers.length - 1]?.rate ?? 0}% (tiered)`
                    : `${product.interestRate ?? 0}%`}
                </td>
                <td className="px-4 py-3">
                  {product.eligibility?.minimumOpeningBalance != null
                    ? `₦${product.eligibility.minimumOpeningBalance.toLocaleString()}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">New</td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
              </tr>
              {COMPARISON_PRODUCTS.map((cp) => (
                <tr key={cp.code} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{cp.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{cp.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{cp.interestRate}</td>
                  <td className="px-4 py-3">{cp.minBalance}</td>
                  <td className="px-4 py-3 text-right">{cp.accounts}</td>
                  <td className="px-4 py-3 text-right text-green-700">{cp.revenueMTD}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save as Draft
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" />
          {product.category === 'ISLAMIC' ? 'Create & Submit' : 'Publish Product'}
        </button>
      </div>
    </div>
  );
}
