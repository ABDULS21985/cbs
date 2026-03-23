import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, CreditCard, FileWarning, Loader2, Shield, Sparkles, User, X } from 'lucide-react';
import { useAccountOpening } from '../hooks/useAccountOpening';
import { CustomerSelectionStep } from '../components/opening/CustomerSelectionStep';
import { ProductSelectionStep } from '../components/opening/ProductSelectionStep';
import { AccountConfigStep } from '../components/opening/AccountConfigStep';
import { ComplianceCheckStep } from '../components/opening/ComplianceCheckStep';
import { ReviewSubmitStep } from '../components/opening/ReviewSubmitStep';
import type { CustomerSearchResult, Product } from '../api/accountOpeningApi';
import { accountOpeningApi } from '../api/accountOpeningApi';
import type { AccountConfig } from '../components/opening/AccountConfigStep';
import type { AccountOpeningFormData } from '../schemas/accountOpeningSchema';

const STEPS = [
  { number: 1, label: 'Customer', description: 'Select customer' },
  { number: 2, label: 'Product', description: 'Choose product' },
  { number: 3, label: 'Configure', description: 'Account setup' },
  { number: 4, label: 'Compliance', description: 'Verification' },
  { number: 5, label: 'Review', description: 'Submit' },
];

interface StepperProps {
  currentStep: number;
  totalSteps: number;
}

function Stepper({ currentStep, totalSteps }: StepperProps) {
  const progress = totalSteps > 1 ? Math.round(((currentStep - 1) / (totalSteps - 1)) * 100) : 0;

  return (
    <div className="opening-stepper-shell space-y-5" role="navigation" aria-label="Account opening progress">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Origination Map</p>
          <h2 className="mt-2 text-base font-semibold">Account Opening</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track readiness from customer selection through submission.</p>
        </div>
        <div className="opening-hero-chip font-mono">{currentStep}/{totalSteps}</div>
      </div>

      <div className="space-y-2">
        <div
          className="opening-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progress}% complete`}
        >
          <div className="opening-progress-fill transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <span>Step {currentStep} of {totalSteps}</span>
        </div>
      </div>

      <div className="hidden lg:grid gap-2">
        {STEPS.map((step) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <div key={step.number}>
              <div className={cn(
                'opening-stepper-item',
                isDone && 'opening-stepper-item-complete',
                isCurrent && 'opening-stepper-item-active',
                !isDone && !isCurrent && 'opening-stepper-item-upcoming',
              )}>
                <div className={cn(
                  'opening-stepper-index',
                  isDone && 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600',
                  isCurrent && 'border-primary/30 bg-primary/10 text-primary',
                )}>
                  {isDone ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn('text-sm font-semibold', isCurrent && 'text-primary')}>{step.label}</p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                      isDone && 'bg-emerald-500/12 text-emerald-600',
                      isCurrent && 'bg-primary/12 text-primary',
                      !isDone && !isCurrent && 'bg-muted text-muted-foreground',
                    )}>
                      {isDone ? 'Complete' : isCurrent ? 'In progress' : 'Queued'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:hidden rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {currentStep}
          </div>
          <div>
            <p className="text-sm font-semibold">{STEPS[currentStep - 1].label}</p>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountOpeningPage() {
  useEffect(() => { document.title = 'Open Account | CBS'; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    formData,
    updateFormData,
    selectedCustomer,
    setSelectedCustomer,
    selectedProduct,
    setSelectedProduct,
    complianceResult,
    runComplianceCheck,
    isCheckingCompliance,
    submitAccount,
    isSubmitting,
    createdAccount,
    hasDraft,
    discardDraft,
  } = useAccountOpening();
  const preselectedCustomerId = searchParams.get('customerId');
  const preselectedProductCode = searchParams.get('productCode');
  const currentStepMeta = STEPS[currentStep - 1];
  const completedSteps = STEPS.filter((step) => step.number < currentStep).length;
  const progress = totalSteps > 1 ? Math.round(((currentStep - 1) / (totalSteps - 1)) * 100) : 0;

  const handleCustomerSelected = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    updateFormData({
      customerId: customer.id,
      customerName: customer.fullName,
      customerType: customer.type,
      customerSegment: customer.segment,
      customerKycStatus: customer.kycStatus,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      accountTitle: customer.fullName,
    });
    nextStep();
  };

  const { data: preselectedCustomer, isLoading: isLoadingPreselectedCustomer } = useQuery({
    queryKey: ['accounts', 'opening', 'customer', preselectedCustomerId],
    queryFn: () => accountOpeningApi.getCustomerById(preselectedCustomerId as string),
    enabled: Boolean(preselectedCustomerId) && !selectedCustomer && currentStep === 1,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (preselectedCustomer && !selectedCustomer && currentStep === 1) {
      setSelectedCustomer(preselectedCustomer);
      updateFormData({
        customerId: preselectedCustomer.id,
        customerName: preselectedCustomer.fullName,
        customerType: preselectedCustomer.type,
        customerSegment: preselectedCustomer.segment,
        customerKycStatus: preselectedCustomer.kycStatus,
        customerPhone: preselectedCustomer.phone,
        customerEmail: preselectedCustomer.email,
        accountTitle: preselectedCustomer.fullName,
      });
      if (preselectedCustomer.kycStatus === 'VERIFIED') {
        nextStep();
      }
    }
  }, [currentStep, nextStep, preselectedCustomer, selectedCustomer, setSelectedCustomer, updateFormData]);

  const handleProductSelected = (product: Product, currency: string) => {
    setSelectedProduct(product);
    updateFormData({
      productId: product.id,
      productName: product.name,
      productType: product.type,
      currency,
    });
    nextStep();
  };

  const handleConfigDone = (config: AccountConfig) => {
    updateFormData({
      accountTitle: config.accountTitle,
      initialDeposit: config.initialDeposit,
      signatories: config.signatories,
      signingRule: config.signingRule as AccountOpeningFormData['signingRule'],
      requestDebitCard: config.requestDebitCard,
      smsAlerts: config.smsAlerts,
      eStatement: config.eStatement,
    });
    nextStep();
  };

  return (
    <div className="page-container space-y-6">
      <section className="opening-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate(-1)} className="opening-hero-chip" aria-label="Go back">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="opening-hero-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Account origination
              </div>
              {preselectedCustomerId && (
                <div className="opening-hero-chip">
                  Customer context {preselectedCustomerId}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Open New Account</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Complete customer validation, choose the right product, configure services, and submit the account in one guided flow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="opening-kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Current Step</p>
                <p className="mt-2 text-lg font-semibold">{currentStepMeta.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</p>
              </div>
              <div className="opening-kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Selected Customer</p>
                <p className="mt-2 text-lg font-semibold">{selectedCustomer?.fullName ?? 'Pending'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedCustomer?.segment ?? 'Choose a verified customer to continue'}</p>
              </div>
              <div className="opening-kpi-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Selected Product</p>
                <p className="mt-2 text-lg font-semibold">{selectedProduct?.name ?? 'Pending'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formData.currency || selectedProduct?.currency || 'Currency not set yet'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="opening-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Flow Status</p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4 text-primary" /> Product readiness
                  </span>
                  <span className="text-sm font-semibold">{selectedProduct ? 'Selected' : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" /> Compliance state
                  </span>
                  <span className="text-sm font-semibold">
                    {complianceResult ? (complianceResult.kycVerified && complianceResult.amlClear && !complianceResult.duplicateFound ? 'Cleared' : 'Attention') : 'Not run'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 text-primary" /> Draft state
                  </span>
                  <span className="text-sm font-semibold">{hasDraft ? 'Saved draft' : 'Fresh flow'}</span>
                </div>
              </div>
            </div>

            <div className="opening-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Progress Snapshot</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold">{progress}%</p>
                  <p className="text-sm text-muted-foreground">{completedSteps} step(s) completed</p>
                </div>
                {isLoadingPreselectedCustomer && currentStep === 1 ? (
                  <div className="opening-hero-chip">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customer
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 self-start">
          <Stepper currentStep={currentStep} totalSteps={totalSteps} />
          <div className="opening-sidebar-shell p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Operating Context</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Customer</p>
                <p className="mt-2 text-sm font-semibold">{selectedCustomer?.fullName ?? 'None selected'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Product</p>
                <p className="mt-2 text-sm font-semibold">{selectedProduct?.name ?? 'Awaiting selection'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Currency</p>
                <p className="mt-2 text-sm font-semibold">{formData.currency || selectedProduct?.currency || 'Pending'}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="opening-workspace-shell">
          <div className="opening-step-banner">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Step {currentStep} of {totalSteps}</p>
                <h2 className="mt-2 text-xl font-semibold">{currentStepMeta.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentStepMeta.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCustomer && <div className="opening-hero-chip">{selectedCustomer.fullName}</div>}
                {selectedProduct && <div className="opening-hero-chip">{selectedProduct.name}</div>}
              </div>
            </div>

            {hasDraft && currentStep > 1 && !createdAccount && (
              <div className="opening-note-card opening-note-card-warning mt-4 flex items-center gap-3">
                <FileWarning className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="flex-1 text-sm text-amber-800">
                  Continuing from a saved draft. Your progress has been restored.
                </p>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Discard
                </button>
              </div>
            )}
          </div>

          <div className="opening-content-shell">
          {currentStep === 1 && (
            <CustomerSelectionStep
              onNext={handleCustomerSelected}
              initialSelectedCustomer={selectedCustomer}
              customerContextId={preselectedCustomerId ?? undefined}
            />
          )}

          {currentStep === 2 && selectedCustomer && (
            <ProductSelectionStep
              customerId={selectedCustomer.id}
              preselectedProductCode={preselectedProductCode}
              onNext={handleProductSelected}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && selectedCustomer && selectedProduct && (
            <AccountConfigStep
              customer={selectedCustomer}
              product={selectedProduct}
              currency={formData.currency || selectedProduct.currency}
              initialValues={{
                accountTitle: formData.accountTitle,
                initialDeposit: formData.initialDeposit,
                signatories: formData.signatories,
                signingRule: formData.signingRule,
                requestDebitCard: formData.requestDebitCard,
                smsAlerts: formData.smsAlerts,
                eStatement: formData.eStatement,
              }}
              onNext={handleConfigDone}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <ComplianceCheckStep
              customerId={formData.customerId || ''}
              productId={formData.productId || ''}
              onNext={nextStep}
              onBack={prevStep}
              complianceResult={complianceResult}
              isLoading={isCheckingCompliance}
              onRunCheck={runComplianceCheck}
            />
          )}

          {currentStep === 5 && complianceResult && (
            <ReviewSubmitStep
              formData={formData as AccountOpeningFormData}
              complianceResult={complianceResult}
              onSubmit={submitAccount}
              onBack={prevStep}
              isSubmitting={isSubmitting}
              createdAccount={createdAccount}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
