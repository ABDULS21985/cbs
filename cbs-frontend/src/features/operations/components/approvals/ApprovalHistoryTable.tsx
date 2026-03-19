import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalRequest, ApprovalType, ApprovalStatus } from '../../api/approvalApi';

interface ApprovalHistoryTableProps {
  history: ApprovalRequest[];
}

type SortField = 'requestNumber' | 'type' | 'amount' | 'decidedAt';
type SortDir = 'asc' | 'desc';

function getLastAction(req: ApprovalRequest): { action: ApprovalStatus; by: string; date: string; comments: string } {
  const last = [...(req.comments ?? [])].reverse().find((c) => c.action !== 'COMMENT');
  return {
    action: req.status,
    by: last?.by ?? req.assignedTo,
    date: last?.timestamp ?? req.submittedAt,
    comments: last?.text ?? '',
  };
}

function ActionBadge({ action }: { action: ApprovalStatus }) {
  const cls = {
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    RETURNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    PENDING: 'bg-muted text-muted-foreground',
    DELEGATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ESCALATED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  }[action] ?? 'bg-muted text-muted-foreground';

  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', cls)}>
      {action}
    </span>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/50" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-foreground" />
    : <ChevronDown className="w-3 h-3 text-foreground" />;
}

const TYPE_OPTIONS: { value: '' | ApprovalType; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'LOAN_APPROVAL', label: 'Loan Approval' },
  { value: 'PAYMENT_APPROVAL', label: 'Payment Approval' },
  { value: 'ACCOUNT_OPENING', label: 'Account Opening' },
  { value: 'FEE_WAIVER', label: 'Fee Waiver' },
  { value: 'RATE_OVERRIDE', label: 'Rate Override' },
  { value: 'WRITE_OFF', label: 'Write-Off' },
  { value: 'RESTRUCTURE', label: 'Restructure' },
  { value: 'LIMIT_CHANGE', label: 'Limit Change' },
  { value: 'KYC_OVERRIDE', label: 'KYC Override' },
  { value: 'PARAMETER_CHANGE', label: 'Parameter Change' },
  { value: 'USER_CREATION', label: 'User Creation' },
  { value: 'CARD_REQUEST', label: 'Card Request' },
];

export function ApprovalHistoryTable({ history }: ApprovalHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | ApprovalType>('');
  const [actionFilter, setActionFilter] = useState<'' | 'APPROVED' | 'REJECTED' | 'RETURNED'>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('decidedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let items = [...history];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.requestNumber.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q),
      );
    }
    if (typeFilter) items = items.filter((r) => r.type === typeFilter);
    if (actionFilter) items = items.filter((r) => r.status === actionFilter);
    if (fromDate) items = items.filter((r) => getLastAction(r).date >= fromDate);
    if (toDate) items = items.filter((r) => getLastAction(r).date <= toDate + 'T23:59:59');

    items.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      switch (sortField) {
        case 'requestNumber': valA = a.requestNumber; valB = b.requestNumber; break;
        case 'type': valA = a.type; valB = b.type; break;
        case 'amount': valA = a.amount ?? 0; valB = b.amount ?? 0; break;
        case 'decidedAt': valA = getLastAction(a).date; valB = getLastAction(b).date; break;
        default: return 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [history, search, typeFilter, actionFilter, fromDate, toDate, sortField, sortDir]);

  const thClass = 'px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | ApprovalType)}
          className="px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as '' | 'APPROVED' | 'REJECTED' | 'RETURNED')}
          className="px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">All Actions</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="RETURNED">Returned</option>
        </select>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            title="From date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            title="To date"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {history.length} records
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No history records match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th
                  className={thClass}
                  onClick={() => handleSort('requestNumber')}
                >
                  <span className="inline-flex items-center gap-1">
                    Request #
                    <SortIcon field="requestNumber" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={thClass}
                  onClick={() => handleSort('type')}
                >
                  <span className="inline-flex items-center gap-1">
                    Type
                    <SortIcon field="type" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th
                  className={cn(thClass, 'text-right')}
                  onClick={() => handleSort('amount')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Amount
                    <SortIcon field="amount" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Decided By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th
                  className={thClass}
                  onClick={() => handleSort('decidedAt')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date
                    <SortIcon field="decidedAt" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((req) => {
                const lastAction = getLastAction(req);
                return (
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{req.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-xs truncate" title={req.description}>{req.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {req.amount !== undefined
                        ? `${req.currency === 'USD' ? '$' : '₦'}${req.amount.toLocaleString()}`
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{lastAction.by}</td>
                    <td className="px-4 py-3">
                      <ActionBadge action={lastAction.action as ApprovalStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {(() => {
                        try { return format(parseISO(lastAction.date), 'dd MMM yyyy, HH:mm'); } catch { return lastAction.date; }
                      })()}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs truncate text-muted-foreground italic" title={lastAction.comments}>
                        {lastAction.comments || '—'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
