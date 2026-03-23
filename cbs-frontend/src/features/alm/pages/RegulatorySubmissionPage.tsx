import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/formatters';
import {
  Shield, Clock, CheckCircle, AlertTriangle, Send,
  FileText, Eye, ChevronRight, X, AlertCircle, History,
} from 'lucide-react';
import {
  useRegulatoryReturns,
  useRegulatoryReturn,
  useValidateReturn,
  useSubmitReturn,
  useReturnSubmissions,
  useAllSubmissions,
} from '../hooks/useAlm';
import type { RegulatoryReturn, RegulatoryReturnDetail, ValidationError } from '../api/almApi';
import { toast } from 'sonner';

// ---- Regulatory Returns List (defined before use) ----

const RETURN_DEFINITIONS = [
  { code: 'IRRBB', name: 'IRRBB Report', frequency: 'QUARTERLY' as const },
  { code: 'LCR', name: 'LCR Return', frequency: 'DAILY' as const },
  { code: 'NSFR', name: 'NSFR Return', frequency: 'MONTHLY' as const },
  { code: 'SLR', name: 'Structural Liquidity Return', frequency: 'MONTHLY' as const },
  { code: 'LER', name: 'Large Exposure Return', frequency: 'QUARTERLY' as const },
];

const frequencyColors: Record<string, string> = {
  DAILY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MONTHLY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  QUARTERLY: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

// ---- Validation Results Panel ---------------------------------------------------

function ValidationPanel({
  errors,
  warnings,
}: {
  errors: ValidationError[];
  warnings: ValidationError[];
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <p className="text-sm text-green-800 dark:text-green-300">All validations passed successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-red-800 dark:text-red-300">
              {errors.length} Error{errors.length !== 1 ? 's' : ''} — Must be resolved before submission
            </p>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900">
            {errors.map((err, i) => (
              <div key={i} className="px-4 py-2 text-sm">
                <span className="text-red-600 font-medium">{err.field}</span>
                <span className="text-muted-foreground mx-2">—</span>
                <span>{err.message}</span>
                <span className="text-xs text-muted-foreground ml-2">({err.rule})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900">
            {warnings.map((warn, i) => (
              <div key={i} className="px-4 py-2 text-sm">
                <span className="text-amber-600 font-medium">{warn.field}</span>
                <span className="text-muted-foreground mx-2">—</span>
                <span>{warn.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Return Detail Drawer -------------------------------------------------------

function ReturnDetailDrawer({
  returnItem,
  onClose,
}: {
  returnItem: RegulatoryReturn;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useRegulatoryReturn(returnItem.id);
  const { data: submissions = [] } = useReturnSubmissions(returnItem.id);
  const validateReturn = useValidateReturn();
  const submitReturn = useSubmitReturn();
  const [validationResult, setValidationResult] = useState<{
    errors: ValidationError[];
    warnings: ValidationError[];
  } | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const handleValidate = () => {
    validateReturn.mutate(returnItem.id, {
      onSuccess: (data) => {
        setValidationResult(data);
        if (data.errors.length === 0) {
          toast.success('Validation passed');
        } else {
          toast.error(`${data.errors.length} validation error(s) found`);
        }
      },
    });
  };

  const handleSubmit = () => {
    submitReturn.mutate(returnItem.id, {
      onSuccess: () => {
        toast.success('Return submitted to CBN successfully');
        setShowConfirmSubmit(false);
        setValidationResult(null);
      },
      onError: () => toast.error('Failed to submit return'),
    });
  };

  // Use the live detail status if available, fall back to the list-level status
  const currentStatus = detail?.status ?? returnItem.status;
  const canSubmit =
    validationResult !== null &&
    validationResult.errors.length === 0 &&
    currentStatus !== 'SUBMITTED';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-background border-l shadow-xl overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{returnItem.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{returnItem.code} Return</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Return Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Frequency</p>
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', frequencyColors[returnItem.frequency])}>
                {returnItem.frequency}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={currentStatus} dot />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Next Due</p>
              <p className="text-sm tabular-nums">{formatDate(returnItem.nextDue)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Submitted</p>
              <p className="text-sm tabular-nums">
                {returnItem.lastSubmissionDate ? formatDate(returnItem.lastSubmissionDate) : 'Never'}
              </p>
            </div>
          </div>

          {/* Pre-populated form data */}
          <div className="surface-card">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">Return Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-populated from ALM calculations</p>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="h-40 rounded-lg bg-muted animate-pulse" />
              ) : detail?.data && Object.keys(detail.data).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(detail.data).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                      <span className="text-xs text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium tabular-nums">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Return data will be populated from the latest ALM computations when available.
                </p>
              )}
            </div>
          </div>

          {/* Validation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Validation</p>
              <button
                onClick={handleValidate}
                disabled={validateReturn.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted disabled:opacity-50"
              >
                <Shield className={cn('w-3.5 h-3.5', validateReturn.isPending && 'animate-spin')} />
                {validateReturn.isPending ? 'Validating...' : 'Run Validation'}
              </button>
            </div>

            {validationResult && (
              <ValidationPanel
                errors={validationResult.errors}
                warnings={validationResult.warnings}
              />
            )}
          </div>

          {/* Submit */}
          <div className="space-y-3">
            {!showConfirmSubmit ? (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Submit to CBN
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Confirm Regulatory Submission
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      You are about to submit the <strong>{returnItem.name}</strong> to the Central Bank of Nigeria.
                      This action will be recorded in the audit trail and cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitReturn.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitReturn.isPending ? 'Submitting...' : 'Confirm Submission'}
                  </button>
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="px-4 py-2 text-xs rounded-lg border hover:bg-background"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submission History */}
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <History className="w-4 h-4" /> Submission History
            </p>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No previous submissions</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Submitted By</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono">{sub.referenceNumber}</td>
                        <td className="px-4 py-3 text-sm tabular-nums">{formatDateTime(sub.submissionDate)}</td>
                        <td className="px-4 py-3 text-sm">{sub.submittedBy}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sub.status} dot />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Returns Console Tab --------------------------------------------------------

function ReturnsConsoleTab() {
  const { data: returns = [], isLoading } = useRegulatoryReturns();
  const [selectedReturn, setSelectedReturn] = useState<RegulatoryReturn | null>(null);

  // Use API data if available, otherwise show static definitions
  const displayReturns: RegulatoryReturn[] =
    returns.length > 0
      ? returns
      : RETURN_DEFINITIONS.map((def, i) => ({
          id: i + 1,
          code: def.code,
          name: def.name,
          frequency: def.frequency,
          dueDate: new Date().toISOString(),
          nextDue: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'DRAFT' as const,
          lastSubmissionDate: undefined,
          lastSubmittedBy: undefined,
          createdAt: new Date().toISOString(),
        }));

  const isDueSoon = (r: RegulatoryReturn) => {
    const daysUntilDue = Math.ceil((new Date(r.nextDue).getTime() - Date.now()) / 86400000);
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  };

  const isOverdue = (r: RegulatoryReturn) => {
    return r.status !== 'SUBMITTED' && new Date(r.nextDue) < new Date();
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {displayReturns.map((ret) => (
        <button
          key={ret.id}
          onClick={() => setSelectedReturn(ret)}
          className={cn(
            'w-full flex items-center justify-between rounded-xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30',
            isOverdue(ret) && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10',
            isDueSoon(ret) && !isOverdue(ret) && 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10',
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold',
              ret.status === 'SUBMITTED'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : ret.status === 'VALIDATED'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            )}>
              {ret.code}
            </div>
            <div>
              <p className="text-sm font-medium">{ret.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', frequencyColors[ret.frequency])}>
                  {ret.frequency}
                </span>
                <span className="text-xs text-muted-foreground">
                  Next due: <span className="tabular-nums">{formatDate(ret.nextDue)}</span>
                </span>
                {ret.lastSubmissionDate && (
                  <span className="text-xs text-muted-foreground">
                    Last: <span className="tabular-nums">{formatDate(ret.lastSubmissionDate)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={ret.status} dot />
            {isOverdue(ret) && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <Clock className="w-3 h-3" /> Overdue
              </span>
            )}
            {isDueSoon(ret) && !isOverdue(ret) && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> Due Soon
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      ))}

      {selectedReturn && (
        <ReturnDetailDrawer
          returnItem={selectedReturn}
          onClose={() => setSelectedReturn(null)}
        />
      )}
    </div>
  );
}

// ---- Submissions History Tab ----------------------------------------------------

function SubmissionsHistoryTab() {
  const { data: submissions = [], isLoading } = useAllSubmissions();

  if (isLoading) {
    return <div className="p-4"><div className="h-64 rounded-xl bg-muted animate-pulse" /></div>;
  }

  return (
    <div className="p-4">
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No regulatory submissions on record.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Return</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Submission Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Submitted By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono">{sub.referenceNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{sub.returnCode}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatDateTime(sub.submissionDate)}</td>
                  <td className="px-4 py-3 text-sm">{sub.submittedBy}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sub.status} dot />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function RegulatorySubmissionPage() {
  const { data: returns = [] } = useRegulatoryReturns();
  const { data: submissions = [] } = useAllSubmissions();

  const pendingReturns = returns.filter((r) => r.status !== 'SUBMITTED');
  const overdueReturns = returns.filter(
    (r) => r.status !== 'SUBMITTED' && new Date(r.nextDue) < new Date(),
  );

  return (
    <>
      <PageHeader
        title="Regulatory Submissions"
        subtitle="CBN/regulatory return console — prepare, validate, and submit ALM-related returns"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Returns"
            value={returns.length || RETURN_DEFINITIONS.length}
            format="number"
            icon={FileText}
          />
          <StatCard
            label="Pending"
            value={pendingReturns.length}
            format="number"
            icon={Clock}
          />
          <StatCard
            label="Overdue"
            value={overdueReturns.length}
            format="number"
            icon={AlertTriangle}
          />
          <StatCard
            label="Submissions YTD"
            value={submissions.length}
            format="number"
            icon={Send}
          />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'returns',
              label: 'Regulatory Returns',
              badge: overdueReturns.length > 0 ? overdueReturns.length : undefined,
              content: <ReturnsConsoleTab />,
            },
            {
              id: 'history',
              label: 'Submission History',
              content: <SubmissionsHistoryTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
