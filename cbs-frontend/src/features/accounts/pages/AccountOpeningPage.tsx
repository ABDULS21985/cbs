import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
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
  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center">
        {STEPS.map((step, index) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  isDone && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'bg-background border-primary text-primary shadow-sm',
                  !isDone && !isCurrent && 'bg-background border-border text-muted-foreground',
                )}>
                  {isDone ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="text-center">
                  <p className={cn('text-xs font-semibold', isCurrent && 'text-primary', !isCurrent && !isDone && 'text-muted-foreground')}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden lg:block">{step.description}</p>
                </div>
              </div>
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                  currentStep > step.number ? 'bg-primary' : 'bg-border',
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {currentStep}
          </div>
          <div>
            <p className="text-sm font-semibold">{STEPS[currentStep - 1].label}</p>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Step {currentStep} of {totalSteps}</p>
      </div>

      {/* Mobile progress bar */}
      <div className="sm:hidden mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function AccountOpeningPage() {
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
  } = useAccountOpening();
  const preselectedCustomerId = searchParams.get('customerId');

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
      nextStep();
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
    <>
      <PageHeader
        title="Open New Account"
        subtitle="Account opening wizard — complete all steps to open the account"
      />

      <div className="page-container max-w-4xl">
        {/* Stepper */}
        <div className="mb-8 p-6 rounded-xl border bg-card">
          <Stepper currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        {/* Step Content */}
        <div className="rounded-xl border bg-card p-6 sm:p-8">
          {currentStep === 1 && (
            <CustomerSelectionStep onNext={handleCustomerSelected} />
          )}

          {currentStep === 2 && selectedCustomer && (
            <ProductSelectionStep
              customerId={selectedCustomer.id}
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

        {isLoadingPreselectedCustomer && currentStep === 1 && (
          <p className="mt-3 text-sm text-muted-foreground">Loading selected customer profile…</p>
        )}
      </div>
    </>
  );
}
