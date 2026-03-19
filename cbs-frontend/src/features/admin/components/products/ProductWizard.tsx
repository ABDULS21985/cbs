import { useState } from 'react';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BankingProduct, ProductType, ProductCategory, CurrencyType, InterestType, RateTier } from '../../api/productApi';
import { RateTierEditor } from './RateTierEditor';
import { FeeLinkageStep } from './FeeLinkageStep';
import { EligibilityRuleBuilder } from './EligibilityRuleBuilder';
import { LimitsControlsStep } from './LimitsControlsStep';
import { ProductReviewStep } from './ProductReviewStep';

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: 'Basic Definition' },
  { id: 1, label: 'Interest & Rate' },
  { id: 2, label: 'Fee Linkage' },
  { id: 3, label: 'Eligibility' },
  { id: 4, label: 'Limits & Controls' },
  { id: 5, label: 'Review & Publish' },
] as const;

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_PRODUCT: Partial<BankingProduct> = {
  code: '',
  name: '',
  shortDescription: '',
  longDescription: '',
  type: 'SAVINGS',
  category: 'RETAIL',
  currency: 'NGN',
  interestType: 'FLAT',
  interestRate: 0,
  rateTiers: [],
  penaltyRate: undefined,
  linkedFees: [],
  eligibility: {
    customerType: 'INDIVIDUAL',
    minimumAge: 18,
    kycLevel: 1,
    minimumOpeningBalance: 1000,
    segment: 'ALL',
    existingProductRequired: null,
    geographicScope: 'ALL',
  },
  limits: {
    dailyDebitLimit: 500000,
    dailyCreditLimit: 5000000,
    perTransactionLimit: 200000,
    atmLimit: 100000,
    posLimit: 300000,
    onlineLimit: 500000,
    maxBalance: 50000000,
    minimumBalance: 1000,
    overdraftAllowed: false,
    dormancyDays: 180,
    dormancyFee: 500,
    channels: ['Branch', 'Mobile', 'Web'],
  },
};

// ─── Product Type Config ─────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ProductType; label: string; icon: string; description: string }[] = [
  { value: 'SAVINGS', label: 'Savings', icon: '💰', description: 'Interest-bearing savings accounts' },
  { value: 'CURRENT', label: 'Current', icon: '🏦', description: 'Transactional current accounts' },
  { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit', icon: '📊', description: 'Term deposits with fixed maturity' },
  { value: 'LOAN', label: 'Loan', icon: '📈', description: 'Credit facilities and term loans' },
  { value: 'CARD', label: 'Card', icon: '💳', description: 'Debit and credit card products' },
  { value: 'INVESTMENT', label: 'Investment', icon: '🤝', description: 'Investment and wealth products' },
];

const ICON_OPTIONS = ['💰', '🏦', '📊', '💳', '🏠', '📈', '🤝', '💎'];

function generateShortCode(name: string): string {
  const words = name.trim().toUpperCase().split(/\s+/).slice(0, 3);
  const abbr = words.map((w) => w.slice(0, 3)).join('-');
  const suffix = Math.floor(Math.random() * 900 + 100);
  return abbr ? `${abbr}-${suffix}` : `PROD-${suffix}`;
}

// ─── Basic Definition Step ───────────────────────────────────────────────────

function BasicDefinitionStep({
  product,
  onChange,
}: {
  product: Partial<BankingProduct>;
  onChange: (p: Partial<BankingProduct>) => void;
}) {
  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
  const selectCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

  return (
    <div className="space-y-6">
      {/* Code and Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Product Code
            <span className="text-muted-foreground font-normal ml-1">(auto-generated or manual)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. SAV-CLASSIC-001"
              value={product.code ?? ''}
              onChange={(e) => onChange({ ...product, code: e.target.value.toUpperCase() })}
              className={cn(inputCls, 'font-mono flex-1')}
            />
            <button
              type="button"
              onClick={() => onChange({ ...product, code: generateShortCode(product.name ?? 'PROD') })}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted/40 whitespace-nowrap transition-colors"
            >
              Generate
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Product Name</label>
          <input
            type="text"
            placeholder="e.g. Classic Savings Account"
            value={product.name ?? ''}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Short Description</label>
        <input
          type="text"
          placeholder="Brief product summary (max 100 chars)"
          value={product.shortDescription ?? ''}
          onChange={(e) => onChange({ ...product, shortDescription: e.target.value })}
          maxLength={100}
          className={inputCls}
        />
        <p className="text-xs text-muted-foreground mt-1">{(product.shortDescription ?? '').length}/100</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Long Description</label>
        <textarea
          rows={3}
          placeholder="Full product description for documentation and customer-facing materials..."
          value={product.longDescription ?? ''}
          onChange={(e) => onChange({ ...product, longDescription: e.target.value })}
          className={cn(inputCls, 'resize-none')}
        />
      </div>

      {/* Product Type — Radio Cards */}
      <div>
        <label className="block text-sm font-medium mb-2">Product Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                product.type === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/20',
              )}
            >
              <input
                type="radio"
                name="productType"
                value={opt.value}
                checked={product.type === opt.value}
                onChange={() => onChange({ ...product, type: opt.value })}
                className="accent-primary mt-0.5"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span>{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Category and Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <select
            value={product.category ?? 'RETAIL'}
            onChange={(e) => onChange({ ...product, category: e.target.value as ProductCategory })}
            className={selectCls}
          >
            <option value="RETAIL">Retail</option>
            <option value="SME">SME</option>
            <option value="CORPORATE">Corporate</option>
            <option value="ISLAMIC">Islamic / Non-interest</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Currency</label>
          <select
            value={product.currency ?? 'NGN'}
            onChange={(e) => onChange({ ...product, currency: e.target.value as CurrencyType })}
            className={selectCls}
          >
            <option value="NGN">NGN — Nigerian Naira</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="MULTI">MULTI — Multi-currency</option>
          </select>
        </div>
      </div>

      {/* Icon Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Product Icon</label>
        <div className="flex gap-2 flex-wrap">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              className={cn(
                'w-10 h-10 flex items-center justify-center text-xl rounded-lg border transition-colors',
                'hover:bg-muted/30',
              )}
              title={icon}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Interest Config Step ─────────────────────────────────────────────────────

function InterestConfigStep({
  product,
  onChange,
}: {
  product: Partial<BankingProduct>;
  onChange: (p: Partial<BankingProduct>) => void;
}) {
  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
  const selectCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

  const isLoan = product.type === 'LOAN';
  const isDeposit = product.type === 'FIXED_DEPOSIT' || product.type === 'SAVINGS';

  const interestTypes: { value: InterestType; label: string; description: string }[] = [
    { value: 'FLAT', label: 'Flat Rate', description: 'Fixed percentage on principal' },
    { value: 'REDUCING_BALANCE', label: 'Reducing Balance', description: 'Rate on outstanding balance' },
    { value: 'COMPOUND', label: 'Compound', description: 'Interest on principal + accrued interest' },
    { value: 'TIERED', label: 'Tiered', description: 'Different rates for different balance ranges' },
    { value: 'NONE', label: 'No Interest', description: 'Non-interest bearing product' },
  ];

  return (
    <div className="space-y-6">
      {/* Interest Type Radios */}
      <div>
        <label className="block text-sm font-medium mb-2">Interest Calculation Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {interestTypes.map((it) => (
            <label
              key={it.value}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                product.interestType === it.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/20',
              )}
            >
              <input
                type="radio"
                name="interestType"
                value={it.value}
                checked={product.interestType === it.value}
                onChange={() => onChange({ ...product, interestType: it.value as InterestType })}
                className="accent-primary mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{it.label}</p>
                <p className="text-xs text-muted-foreground">{it.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Flat / Reducing / Compound rate */}
      {(product.interestType === 'FLAT' ||
        product.interestType === 'REDUCING_BALANCE' ||
        product.interestType === 'COMPOUND') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isLoan ? 'Annual Interest Rate (%)' : 'Credit Interest Rate (% p.a.)'}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={product.interestRate ?? 0}
              onChange={(e) => onChange({ ...product, interestRate: Number(e.target.value) })}
              className={inputCls}
            />
          </div>

          {isLoan && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Base Rate (%)</label>
                <input type="number" min={0} step={0.01} placeholder="e.g. 12.0" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Spread (%)</label>
                <input type="number" min={0} step={0.01} placeholder="e.g. 10.0" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Floor Rate (%)</label>
                <input type="number" min={0} step={0.01} placeholder="e.g. 18.0" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Ceiling Rate (%)</label>
                <input type="number" min={0} step={0.01} placeholder="e.g. 30.0" className={inputCls} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tiered rate editor */}
      {product.interestType === 'TIERED' && (
        <div>
          <label className="block text-sm font-medium mb-2">Rate Tiers</label>
          <RateTierEditor
            tiers={product.rateTiers ?? []}
            onChange={(tiers: RateTier[]) => onChange({ ...product, rateTiers: tiers })}
          />
        </div>
      )}

      {/* Deposit-specific settings */}
      {isDeposit && product.interestType !== 'NONE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Day Count Convention</label>
            <select className={selectCls}>
              <option value="ACT_365">Actual/365</option>
              <option value="ACT_360">Actual/360</option>
              <option value="30_360">30/360</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Accrual Frequency</label>
            <select className={selectCls}>
              <option value="DAILY">Daily</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Interest Posting Frequency</label>
            <select className={selectCls}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="AT_MATURITY">At Maturity</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
        </div>
      )}

      {/* Penalty Rate */}
      {product.interestType !== 'NONE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Penalty Rate (%)
              <span className="text-muted-foreground font-normal ml-1">optional</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={product.penaltyRate ?? ''}
              placeholder="0.00"
              onChange={(e) =>
                onChange({
                  ...product,
                  penaltyRate: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isLoan ? 'Penalty on late repayment.' : 'Penalty for early withdrawal.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wizard Shell ─────────────────────────────────────────────────────────────

interface ProductWizardProps {
  onComplete: (product: Partial<BankingProduct>) => void;
  onCancel: () => void;
  initialData?: Partial<BankingProduct>;
}

export function ProductWizard({ onComplete, onCancel, initialData }: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [product, setProduct] = useState<Partial<BankingProduct>>(initialData ?? DEFAULT_PRODUCT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markComplete = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const goToStep = (step: number) => {
    markComplete(currentStep);
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    onComplete({ ...product, status: 'DRAFT' });
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    onComplete({ ...product, status: 'ACTIVE' });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicDefinitionStep product={product} onChange={setProduct} />;
      case 1:
        return <InterestConfigStep product={product} onChange={setProduct} />;
      case 2:
        return (
          <FeeLinkageStep
            linkedFees={product.linkedFees ?? []}
            onChange={(fees) => setProduct({ ...product, linkedFees: fees })}
          />
        );
      case 3:
        return (
          <EligibilityRuleBuilder
            rules={
              product.eligibility ?? {
                customerType: 'INDIVIDUAL',
                minimumAge: 18,
                kycLevel: 1,
                minimumOpeningBalance: 1000,
                segment: 'ALL',
                existingProductRequired: null,
                geographicScope: 'ALL',
              }
            }
            onChange={(rules) => setProduct({ ...product, eligibility: rules })}
          />
        );
      case 4:
        return (
          <LimitsControlsStep
            limits={
              product.limits ?? {
                dailyDebitLimit: 500000,
                dailyCreditLimit: 5000000,
                perTransactionLimit: 200000,
                atmLimit: 100000,
                posLimit: 300000,
                onlineLimit: 500000,
                maxBalance: 50000000,
                minimumBalance: 1000,
                overdraftAllowed: false,
                dormancyDays: 180,
                dormancyFee: 500,
                channels: ['Branch', 'Mobile', 'Web'],
              }
            }
            onChange={(limits) => setProduct({ ...product, limits })}
          />
        );
      case 5:
        return (
          <ProductReviewStep
            product={product}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Step Indicator */}
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(idx);
            const isCurrent = currentStep === idx;
            return (
              <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => (isCompleted || idx < currentStep) && goToStep(idx)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    isCurrent && 'bg-primary text-primary-foreground font-medium',
                    !isCurrent && isCompleted && 'text-green-700 hover:bg-green-50 cursor-pointer',
                    !isCurrent && !isCompleted && idx > currentStep && 'text-muted-foreground cursor-not-allowed',
                    !isCurrent && !isCompleted && idx < currentStep && 'text-foreground hover:bg-muted/40 cursor-pointer',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Circle className={cn('w-4 h-4', isCurrent ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  )}
                  <span>{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="w-6 h-px bg-border flex-shrink-0" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-1">
          Step {currentStep + 1}: {STEPS[currentStep].label}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {currentStep === 0 && 'Set the fundamental attributes of your product.'}
          {currentStep === 1 && 'Configure how interest is calculated and applied.'}
          {currentStep === 2 && 'Attach and configure fee structures for this product.'}
          {currentStep === 3 && 'Define which customers are eligible to open this product.'}
          {currentStep === 4 && 'Set transaction limits, balance controls, and channel availability.'}
          {currentStep === 5 && 'Review your product configuration before saving or publishing.'}
        </p>

        {renderStep()}
      </div>

      {/* Navigation Footer (hidden on review step which has its own buttons) */}
      {currentStep < 5 && (
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Back button on review step */}
      {currentStep === 5 && (
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      )}
    </div>
  );
}
