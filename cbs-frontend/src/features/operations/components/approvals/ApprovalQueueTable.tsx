import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { ApprovalRequest, ApprovalPriority, ApprovalStatus, ApprovalType } from '../../api/approvalApi';
import { SlaBadge } from './SlaBadge';

interface ApprovalQueueTableProps {
  items: ApprovalRequest[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onSelectItem: (item: ApprovalRequest) => void;
}

function getTypeBadgeClass(type: ApprovalType): string {
  switch (type) {
    case 'LOAN_APPROVAL':
    case 'RESTRUCTURE':
    case 'WRITE_OFF':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'PAYMENT_APPROVAL':
    case 'LIMIT_CHANGE':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'ACCOUNT_OPENING':
    case 'USER_CREATION':
    case 'CARD_REQUEST':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    case 'FEE_WAIVER':
    case 'RATE_OVERRIDE':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'PARAMETER_CHANGE':
    case 'KYC_OVERRIDE':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: ApprovalType): string {
  const labels: Record<ApprovalType, string> = {
    ACCOUNT_OPENING: 'Account Opening',
    LOAN_APPROVAL: 'Loan Approval',
    PAYMENT_APPROVAL: 'Payment',
    FEE_WAIVER: 'Fee Waiver',
    RATE_OVERRIDE: 'Rate Override',
    PARAMETER_CHANGE: 'Param Change',
    USER_CREATION: 'User Creation',
    CARD_REQUEST: 'Card Request',
    WRITE_OFF: 'Write-Off',
    RESTRUCTURE: 'Restructure',
    LIMIT_CHANGE: 'Limit Change',
    KYC_OVERRIDE: 'KYC Override',
  };
  return labels[type] ?? type;
}

function getPriorityBadgeClass(priority: ApprovalPriority): string {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'HIGH': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'NORMAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'LOW': return 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400';
  }
}

function getStatusBadgeClass(status: ApprovalStatus): string {
  switch (status) {
    case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'RETURNED': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'DELEGATED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'ESCALATED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function ApprovalQueueTable({
  items,
  selectedIds,
  onSelectIds,
  onSelectItem,
}: ApprovalQueueTableProps) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id));
  const someSelected = items.some((i) => selectedIds.includes(i.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectIds(selectedIds.filter((id) => !items.find((i) => i.id === id)));
    } else {
      const newIds = items.map((i) => i.id).filter((id) => !selectedIds.includes(id));
      onSelectIds([...selectedIds, ...newIds]);
    }
  };

  const handleSelectOne = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      onSelectIds([...selectedIds, id]);
    } else {
      onSelectIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-sm">No approval requests found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-10 px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={handleSelectAll}
                className="rounded border-border cursor-pointer"
                aria-label="Select all"
              />
            </th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">#</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Request #</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Requested By</th>
            <th className="px-3 py-3 text-right font-medium text-muted-foreground">Amount</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Priority</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Submitted</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">SLA</th>
            <th className="px-3 py-3 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, idx) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-muted/40',
                  isSelected && 'bg-primary/5 hover:bg-primary/10',
                )}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectOne(item.id, e)}
                    className="rounded border-border cursor-pointer"
                    aria-label={`Select ${item.requestNumber}`}
                  />
                </td>
                <td className="px-3 py-3 text-muted-foreground tabular-nums">{idx + 1}</td>
                <td className="px-3 py-3 font-mono font-medium text-xs whitespace-nowrap">
                  {item.requestNumber}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
                      getTypeBadgeClass(item.type),
                    )}
                  >
                    {getTypeLabel(item.type)}
                  </span>
                </td>
                <td className="px-3 py-3 max-w-[240px]">
                  <p className="truncate text-xs" title={item.description}>
                    {item.description}
                  </p>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <p className="text-xs font-medium">{item.requestedBy}</p>
                  <p className="text-xs text-muted-foreground">{item.requestedByRole}</p>
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                  {item.amount !== undefined
                    ? `${item.currency === 'USD' ? '$' : '₦'}${item.amount.toLocaleString()}`
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium',
                      getPriorityBadgeClass(item.priority),
                    )}
                  >
                    {item.priority}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  {formatRelativeTime(item.submittedAt)}
                </td>
                <td className="px-3 py-3">
                  <SlaBadge deadline={item.slaDeadline} submittedAt={item.submittedAt} />
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-medium',
                      getStatusBadgeClass(item.status),
                    )}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
