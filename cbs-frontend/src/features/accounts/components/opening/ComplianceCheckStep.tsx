import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronLeft, ChevronRight, RefreshCw, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ComplianceCheckResult } from '../../api/accountOpeningApi';

interface ComplianceCheckStepProps {
  customerId: string;
  productId: string;
  onNext: () => void;
  onBack: () => void;
  complianceResult: ComplianceCheckResult | null;
  isLoading: boolean;
  onRunCheck: () => void;
}

interface CheckRowProps {
  label: string;
  description: string;
  passed: boolean | null;
  isWarning?: boolean;
  extra?: React.ReactNode;
}

function CheckRow({ label, description, passed, isWarning, extra }: CheckRowProps) {
  return (
    <div className={cn(
      'flex items-start gap-4 p-4 rounded-lg border transition-colors',
      passed === null && 'bg-muted/30 border-border',
      passed === true && !isWarning && 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800/40',
      passed === false && 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40',
      isWarning && passed === false && 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/40',
    )}>
      <div className="flex-shrink-0 mt-0.5">
        {passed === null ? (
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
        ) : passed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : isWarning ? (
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          passed === true && !isWarning && 'text-green-700 dark:text-green-300',
          passed === false && !isWarning && 'text-red-700 dark:text-red-300',
          isWarning && passed === false && 'text-amber-700 dark:text-amber-300',
        )}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {extra && <div className="mt-2">{extra}</div>}
      </div>
    </div>
  );
}

export function ComplianceCheckStep({
  customerId,
  productId: _productId,
  onNext,
  onBack,
  complianceResult,
  isLoading,
  onRunCheck,
}: ComplianceCheckStepProps) {
  const navigate = useNavigate();

  // Auto-run compliance check on mount if not already done
  useEffect(() => {
    if (!complianceResult && !isLoading) {
      onRunCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allClear = complianceResult
    ? complianceResult.kycVerified &&
      complianceResult.amlClear &&
      !complianceResult.duplicateFound
    : false;

  const canProceed = allClear && !isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Compliance Check</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Running automated compliance verification before opening the account.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-sm font-medium">Running compliance checks...</p>
          <p className="text-xs text-muted-foreground">This usually takes a few seconds</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <div className="space-y-3">
          {/* KYC */}
          <CheckRow
            label={`KYC Verified${complianceResult ? ` — Level: ${complianceResult.kycLevel.replace('_', ' ')}` : ''}`}
            description="Customer identity has been verified against the national identity database."
            passed={complianceResult ? complianceResult.kycVerified : null}
            extra={
              complianceResult && !complianceResult.kycVerified ? (
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${customerId}/kyc`)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Complete KYC verification →
                </button>
              ) : undefined
            }
          />

          {/* AML */}
          <CheckRow
            label="AML Screening Clear"
            description="Customer has been screened against AML watchlists and sanctions databases."
            passed={complianceResult ? complianceResult.amlClear : null}
            extra={
              complianceResult && !complianceResult.amlClear ? (
                <button
                  type="button"
                  onClick={() => navigate('/risk/aml')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Review AML alerts →
                </button>
              ) : undefined
            }
          />

          {/* Duplicate */}
          <CheckRow
            label="No Duplicate Account"
            description="Verified that no duplicate account of this type already exists for the customer."
            passed={complianceResult ? !complianceResult.duplicateFound : null}
          />

          {/* Dormant */}
          <CheckRow
            label="Dormant Account Check"
            description="Checked for existing dormant accounts that could be reactivated instead."
            passed={complianceResult ? !complianceResult.dormantAccountExists : null}
            isWarning={complianceResult?.dormantAccountExists}
            extra={
              complianceResult?.dormantAccountExists ? (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    A dormant account was found. Consider reactivating it instead.
                  </p>
                  {complianceResult.dormantAccountId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/accounts/${complianceResult.dormantAccountId}`)}
                      className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium flex-shrink-0 border border-amber-300 dark:border-amber-700 rounded px-2 py-0.5"
                    >
                      Reactivate instead?
                    </button>
                  )}
                </div>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Summary banner */}
      {complianceResult && !isLoading && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-lg border',
          allClear
            ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/40'
            : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40',
        )}>
          <Shield className={cn('w-5 h-5 flex-shrink-0', allClear ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
          <div>
            <p className={cn('text-sm font-medium', allClear ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
              {allClear ? 'All compliance checks passed' : 'Compliance checks require attention'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allClear
                ? 'This account can proceed to review and submission.'
                : 'Resolve the issues above before proceeding to open this account.'}
            </p>
          </div>
          {!allClear && (
            <button
              type="button"
              onClick={onRunCheck}
              className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-run
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
            canProceed
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          Proceed to Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
