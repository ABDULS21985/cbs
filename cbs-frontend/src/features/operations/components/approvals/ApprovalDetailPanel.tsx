import { X, FileText, ChevronRight, Check, XCircle, Clock, RotateCcw, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { ApprovalRequest, ApprovalChainStep, ApprovalComment, ApprovalType } from '../../api/approvalApi';
import { ApprovalActions } from './ApprovalActions';
import { SlaBadge } from './SlaBadge';

interface ApprovalDetailPanelProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onAction: (action: 'approve' | 'reject' | 'return' | 'delegate', id: string, data?: string) => void;
  loading?: boolean;
}

function getTypeLabel(type: ApprovalType): string {
  const labels: Record<ApprovalType, string> = {
    ACCOUNT_OPENING: 'Account Opening',
    LOAN_APPROVAL: 'Loan Approval',
    PAYMENT_APPROVAL: 'Payment Approval',
    FEE_WAIVER: 'Fee Waiver',
    RATE_OVERRIDE: 'Rate Override',
    PARAMETER_CHANGE: 'Parameter Change',
    USER_CREATION: 'User Creation',
    CARD_REQUEST: 'Card Request',
    WRITE_OFF: 'Write-Off',
    RESTRUCTURE: 'Loan Restructure',
    LIMIT_CHANGE: 'Limit Change',
    KYC_OVERRIDE: 'KYC Override',
  };
  return labels[type] ?? type;
}

function formatTs(ts: string): string {
  try { return format(parseISO(ts), 'dd MMM yyyy, HH:mm'); } catch { return ts; }
}

function ChainStepIcon({ status }: { status: ApprovalChainStep['status'] }) {
  switch (status) {
    case 'APPROVED':
      return <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      </div>;
    case 'REJECTED':
      return <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
      </div>;
    case 'SKIPPED':
      return <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </div>;
    default:
      return <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
        <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
      </div>;
  }
}

function CommentActionIcon({ action }: { action: ApprovalComment['action'] }) {
  switch (action) {
    case 'APPROVE': return <Check className="w-3.5 h-3.5 text-green-500" />;
    case 'REJECT': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'RETURN': return <RotateCcw className="w-3.5 h-3.5 text-amber-500" />;
    default: return null;
  }
}

function TypeSpecificDetails({ request }: { request: ApprovalRequest }) {
  const rows: Array<{ label: string; value: string }> = [];

  switch (request.type) {
    case 'LOAN_APPROVAL':
    case 'RESTRUCTURE':
      if (request.amount) rows.push({ label: 'Loan Amount', value: `₦${request.amount.toLocaleString()}` });
      if (request.entityId) rows.push({ label: 'Loan ID', value: request.entityId });
      rows.push({ label: 'SLA Hours', value: `${request.slaHours}h` });
      break;
    case 'PAYMENT_APPROVAL':
      if (request.amount) rows.push({ label: 'Transfer Amount', value: `${request.currency === 'USD' ? '$' : '₦'}${request.amount.toLocaleString()}` });
      if (request.entityId) rows.push({ label: 'Debit Account', value: request.entityId });
      rows.push({ label: 'SLA Hours', value: `${request.slaHours}h` });
      break;
    case 'FEE_WAIVER':
      if (request.amount) rows.push({ label: 'Fee Amount', value: `₦${request.amount.toLocaleString()}` });
      if (request.entityId) rows.push({ label: 'Account', value: request.entityId });
      break;
    case 'RATE_OVERRIDE':
      if (request.entityId) rows.push({ label: 'Account', value: request.entityId });
      rows.push({ label: 'SLA Hours', value: `${request.slaHours}h` });
      break;
    case 'WRITE_OFF':
      if (request.amount) rows.push({ label: 'Write-Off Amount', value: `₦${request.amount.toLocaleString()}` });
      if (request.entityId) rows.push({ label: 'Loan Reference', value: request.entityId });
      break;
    default:
      if (request.entityId) rows.push({ label: 'Entity ID', value: request.entityId });
      if (request.entityType) rows.push({ label: 'Entity Type', value: request.entityType });
  }

  return (
    <dl className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="text-xs font-medium font-mono text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ApprovalDetailPanel({ request, onClose, onAction, loading = false }: ApprovalDetailPanelProps) {
  if (!request) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {request.requestNumber}
            </span>
            <span className={cn(
              'inline-block px-2 py-0.5 rounded text-xs font-medium',
              request.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              request.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              request.priority === 'NORMAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              'bg-muted text-muted-foreground',
            )}>
              {request.priority}
            </span>
          </div>
          <h3 className="font-semibold text-sm leading-snug">{getTypeLabel(request.type)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{request.description}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Request Details */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Request Details
            </h4>
            <TypeSpecificDetails request={request} />
          </div>

          {/* Requestor Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Requestor
            </h4>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="text-xs font-medium">{request.requestedBy}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd className="text-xs font-medium">{request.requestedByRole}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground">Submitted</dt>
                <dd className="text-xs font-medium">{formatTs(request.submittedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted-foreground">SLA Deadline</dt>
                <dd className="text-xs"><SlaBadge deadline={request.slaDeadline} submittedAt={request.submittedAt} /></dd>
              </div>
              {request.entityId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-xs text-muted-foreground">Entity</dt>
                  <dd className="text-xs">
                    <span className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer font-mono font-medium">
                      {request.entityId}
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Approval Chain */}
        {request.approvalChain && request.approvalChain.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Approval Chain
            </h4>
            <div className="space-y-0">
              {request.approvalChain.map((step, idx) => (
                <div key={step.level} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <ChainStepIcon status={step.status} />
                    {idx < request.approvalChain!.length - 1 && (
                      <div className={cn(
                        'w-0.5 flex-1 my-1 min-h-[16px]',
                        step.status === 'APPROVED' ? 'bg-green-300 dark:bg-green-700' : 'bg-border',
                      )} />
                    )}
                  </div>
                  <div className="pb-4 pt-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{step.approver}</span>
                      <span className="text-xs text-muted-foreground">{step.role}</span>
                    </div>
                    {step.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatTs(step.timestamp)}</p>
                    )}
                    {step.comments && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">"{step.comments}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {request.documents && request.documents.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Supporting Documents ({request.documents.length})
            </h4>
            <div className="space-y-1.5">
              {request.documents.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{doc}</span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Thread */}
        {request.comments && request.comments.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Activity ({request.comments.length})
            </h4>
            <div className="space-y-3">
              {request.comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {comment.by.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{comment.by}</span>
                      <span className="text-xs text-muted-foreground">{comment.role}</span>
                      {comment.action !== 'COMMENT' && (
                        <span className="inline-flex items-center gap-0.5">
                          <CommentActionIcon action={comment.action} />
                          <span className="text-xs font-medium capitalize">
                            {comment.action.toLowerCase()}d
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{comment.text}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{formatTs(comment.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div className="px-5 py-4 border-t border-border flex-shrink-0 bg-muted/10">
        <ApprovalActions
          request={request}
          onApprove={(comments) => onAction('approve', request.id, comments)}
          onReject={(reason) => onAction('reject', request.id, reason)}
          onReturn={(comments) => onAction('return', request.id, comments)}
          onDelegate={() => onAction('delegate', request.id)}
          loading={loading}
        />
      </div>
    </div>
  );
}
