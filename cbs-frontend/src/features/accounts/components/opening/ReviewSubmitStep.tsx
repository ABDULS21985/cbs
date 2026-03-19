import { useState } from 'react';
import { ChevronLeft, Loader2, CheckCircle2, Printer, CreditCard, MessageSquare, FileText, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoGrid, MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatAccountNumber } from '@/lib/formatters';
import type { AccountOpeningFormData } from '../../schemas/accountOpeningSchema';
import type { ComplianceCheckResult, CreatedAccount } from '../../api/accountOpeningApi';

interface ReviewSubmitStepProps {
  formData: AccountOpeningFormData;
  complianceResult: ComplianceCheckResult;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  createdAccount: CreatedAccount | null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</h4>;
}

export function ReviewSubmitStep({
  formData,
  complianceResult,
  onSubmit,
  onBack,
  isSubmitting,
  createdAccount,
}: ReviewSubmitStepProps) {
  const [termsAccepted, setTermsAccepted] = useState(formData.termsAccepted ?? false);

  const handlePrintWelcomeLetter = () => {
    window.print();
  };

  // Success state
  if (createdAccount) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-700 dark:text-green-300">Account Opened Successfully!</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            The account has been created and is ready for use.
          </p>
        </div>

        {/* Account details */}
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10 p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Number</p>
            <p className="text-3xl font-bold font-mono mt-1 text-green-700 dark:text-green-300 tracking-widest">
              {formatAccountNumber(createdAccount.accountNumber)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200 dark:border-green-800/40">
            <div>
              <p className="text-xs text-muted-foreground">Account Title</p>
              <p className="text-sm font-semibold mt-0.5">{createdAccount.accountTitle}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Product</p>
              <p className="text-sm font-semibold mt-0.5">{createdAccount.productName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="text-sm font-semibold mt-0.5">{createdAccount.currency}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={createdAccount.status} dot />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handlePrintWelcomeLetter}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex-1"
          >
            <Printer className="w-4 h-4" />
            Print Welcome Letter
          </button>
          <a
            href={`/accounts/${createdAccount.accountNumber}`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex-1"
          >
            View Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">Please review all account details before submitting.</p>
      </div>

      {/* Customer Summary */}
      <div className="rounded-lg border p-5 space-y-3">
        <SectionTitle>Customer</SectionTitle>
        <InfoGrid
          columns={3}
          items={[
            { label: 'Full Name', value: formData.customerName },
            { label: 'Customer Type', value: formData.customerType },
            { label: 'Segment', value: formData.customerSegment },
            { label: 'KYC Status', value: formData.customerKycStatus },
            { label: 'Phone', value: formData.customerPhone },
            { label: 'Email', value: formData.customerEmail },
          ]}
        />
      </div>

      {/* Product Summary */}
      <div className="rounded-lg border p-5 space-y-3">
        <SectionTitle>Product</SectionTitle>
        <InfoGrid
          columns={3}
          items={[
            { label: 'Product Name', value: formData.productName },
            { label: 'Account Type', value: formData.productType },
            { label: 'Currency', value: formData.currency },
          ]}
        />
      </div>

      {/* Configuration Summary */}
      <div className="rounded-lg border p-5 space-y-4">
        <SectionTitle>Account Configuration</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Account Title</p>
            <p className="text-sm font-semibold mt-0.5">{formData.accountTitle}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Initial Deposit</p>
            <div className="mt-0.5">
              <MoneyDisplay amount={formData.initialDeposit} currency={formData.currency} size="md" />
            </div>
          </div>
        </div>

        {/* Linked services */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Linked Services</p>
          <div className="flex flex-wrap gap-2">
            {formData.requestDebitCard && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-medium">
                <CreditCard className="w-3 h-3" />
                Debit Card
              </div>
            )}
            {formData.smsAlerts && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs font-medium">
                <MessageSquare className="w-3 h-3" />
                SMS Alerts
              </div>
            )}
            {formData.eStatement && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-medium">
                <FileText className="w-3 h-3" />
                e-Statement
              </div>
            )}
            {!formData.requestDebitCard && !formData.smsAlerts && !formData.eStatement && (
              <span className="text-xs text-muted-foreground">No linked services selected</span>
            )}
          </div>
        </div>

        {/* Signatories */}
        {formData.signatories && formData.signatories.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Signatories — {formData.signingRule?.replace('_', ' ')} authorization
            </p>
            <div className="space-y-1.5">
              {formData.signatories.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{sig.fullName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-xs">{sig.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      <div className="rounded-lg border p-5 space-y-3">
        <SectionTitle>Compliance Clearance</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'KYC Verified', passed: complianceResult.kycVerified },
            { label: 'AML Clear', passed: complianceResult.amlClear },
            { label: 'No Duplicate', passed: !complianceResult.duplicateFound },
            { label: 'Dormant Check', passed: !complianceResult.dormantAccountExists, warning: complianceResult.dormantAccountExists },
          ].map((item, i) => (
            <div key={i} className={cn(
              'flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium',
              item.passed && !item.warning && 'bg-green-50 text-green-700 dark:bg-green-900/10 dark:text-green-400',
              !item.passed && !item.warning && 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400',
              item.warning && 'bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400',
            )}>
              {item.passed && !item.warning
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                : <span className="w-3.5 h-3.5 flex-shrink-0 text-center leading-none">✗</span>
              }
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-lg border p-5 bg-muted/20">
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            role="checkbox"
            aria-checked={termsAccepted}
            tabIndex={0}
            onClick={() => setTermsAccepted(!termsAccepted)}
            onKeyDown={(e) => e.key === ' ' && setTermsAccepted(!termsAccepted)}
            className={cn(
              'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors',
              termsAccepted ? 'bg-primary border-primary' : 'border-border hover:border-primary/60',
            )}
          >
            {termsAccepted && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
          <div>
            <p className="text-sm font-medium">I confirm that all information provided is accurate and complete.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              By submitting this form, I acknowledge that the account opening is subject to the bank's{' '}
              <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Terms and Conditions
              </a>{' '}
              and applicable regulatory requirements. The customer has been duly informed of all applicable fees and charges.
            </p>
          </div>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          disabled={!termsAccepted || isSubmitting}
          onClick={onSubmit}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors min-w-[140px] justify-center',
            termsAccepted && !isSubmitting
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opening Account...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Open Account
            </>
          )}
        </button>
      </div>
    </div>
  );
}
