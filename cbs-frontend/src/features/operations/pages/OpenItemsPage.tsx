import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, X, AlertTriangle, Clock, UserCheck, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import type { OpenItem } from '../types/openItem';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ItemType = 'RECON_BREAK' | 'UNMATCHED_TXN' | 'SUSPENSE' | 'EXCEPTION' | 'INVESTIGATION';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type ItemStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
type ResolutionType = 'CORRECTED' | 'WRITTEN_OFF' | 'REVERSED' | 'RECLASSIFIED' | 'OTHER';

interface CreateItemRequest {
  itemType: ItemType;
  description: string;
  amount: number;
  currency: string;
  priority: Priority;
  relatedRef?: string;
}

interface AssignRequest {
  assignedTo: string;
  assignedTeam: string;
}

interface ResolveRequest {
  resolutionNotes: string;
  resolutionAction: ResolutionType;
}

// ─── API ────────────────────────────────────────────────────────────────────────

const openItemsPageApi = {
  getAll: () => apiGet<OpenItem[]>('/api/v1/open-items'),
  create: (data: CreateItemRequest) => apiPost<OpenItem>('/api/v1/open-items', data),
  assign: (code: string, data: AssignRequest) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/assign`, data),
  resolve: (code: string, data: ResolveRequest) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/resolve`, data),
  escalate: (code: string) =>
    apiPost<OpenItem>(`/api/v1/open-items/${code}/escalate`),
};

const KEYS = {
  all: ['open-items', 'all'] as const,
};

// ─── Type Badge ─────────────────────────────────────────────────────────────────

const ITEM_TYPE_COLORS: Record<string, string> = {
  RECON_BREAK: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNMATCHED_TXN: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUSPENSE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EXCEPTION: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  INVESTIGATION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function ItemTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ITEM_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600')}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600')}>
      {priority}
    </span>
  );
}

// ─── Age helpers ────────────────────────────────────────────────────────────────

function ageColor(days: number): string {
  if (days > 60) return 'text-red-600 font-semibold';
  if (days > 30) return 'text-amber-600 font-medium';
  return 'text-green-600';
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function OpenItemsPage() {
  const qc = useQueryClient();

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ code: string } | null>(null);
  const [resolveDialog, setResolveDialog] = useState<{ code: string } | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Forms
  const [createForm, setCreateForm] = useState<CreateItemRequest>({
    itemType: 'RECON_BREAK',
    description: '',
    amount: 0,
    currency: 'NGN',
    priority: 'MEDIUM',
    relatedRef: '',
  });

  const [assignForm, setAssignForm] = useState<AssignRequest>({ assignedTo: '', assignedTeam: '' });
  const [resolveForm, setResolveForm] = useState<ResolveRequest>({ resolutionNotes: '', resolutionAction: 'CORRECTED' });

  // Data
  const { data: items = [], isLoading } = useQuery({
    queryKey: KEYS.all,
    queryFn: openItemsPageApi.getAll,
    staleTime: 15_000,
  });

  // Mutations
  const createItem = useMutation({
    mutationFn: openItemsPageApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Open item created');
      setShowCreate(false);
      setCreateForm({ itemType: 'RECON_BREAK', description: '', amount: 0, currency: 'NGN', priority: 'MEDIUM', relatedRef: '' });
    },
    onError: () => toast.error('Failed to create item'),
  });

  const assignItem = useMutation({
    mutationFn: ({ code, data }: { code: string; data: AssignRequest }) =>
      openItemsPageApi.assign(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Item assigned');
      setAssignDialog(null);
      setAssignForm({ assignedTo: '', assignedTeam: '' });
    },
    onError: () => toast.error('Failed to assign item'),
  });

  const resolveItem = useMutation({
    mutationFn: ({ code, data }: { code: string; data: ResolveRequest }) =>
      openItemsPageApi.resolve(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Item resolved');
      setResolveDialog(null);
      setResolveForm({ resolutionNotes: '', resolutionAction: 'CORRECTED' });
    },
    onError: () => toast.error('Failed to resolve item'),
  });

  const escalateItem = useMutation({
    mutationFn: openItemsPageApi.escalate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Item escalated');
    },
    onError: () => toast.error('Failed to escalate item'),
  });

  // Filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== 'ALL' && item.itemType !== filterType) return false;
      if (filterPriority !== 'ALL' && item.priority !== filterPriority) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (filterAssignee && !item.assignedTo?.toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      return true;
    });
  }, [items, filterType, filterPriority, filterStatus, filterAssignee]);

  // Stats
  const totalOpen = items.filter((i) => i.status !== 'RESOLVED').length;
  const bucket030 = items.filter((i) => i.status !== 'RESOLVED' && i.agingDays <= 30).length;
  const bucket3160 = items.filter((i) => i.status !== 'RESOLVED' && i.agingDays > 30 && i.agingDays <= 60).length;
  const bucket60plus = items.filter((i) => i.status !== 'RESOLVED' && i.agingDays > 60).length;

  const agingChartData = [
    { bucket: '0-30 Days', count: bucket030 },
    { bucket: '31-60 Days', count: bucket3160 },
    { bucket: '>60 Days', count: bucket60plus },
  ];

  // Columns
  const columns: ColumnDef<OpenItem, unknown>[] = useMemo(
    () => [
      { accessorKey: 'itemCode', header: 'Item ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.itemCode}</span> },
      { accessorKey: 'itemType', header: 'Type', cell: ({ row }) => <ItemTypeBadge type={row.original.itemType} /> },
      { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.description}</span> },
      { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.amount, row.original.currency)}</span> },
      { accessorKey: 'currency', header: 'Currency', cell: ({ row }) => <span className="text-sm">{row.original.currency}</span> },
      {
        accessorKey: 'agingDays',
        header: 'Age (days)',
        cell: ({ row }) => (
          <span className={cn('text-sm', ageColor(row.original.agingDays))}>
            {row.original.agingDays}d
          </span>
        ),
      },
      { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ row }) => <span className="text-sm">{row.original.assignedTo || '-'}</span> },
      { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { accessorKey: 'valueDate', header: 'Created', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.valueDate)}</span> },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original;
          if (item.status === 'RESOLVED') return null;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAssignDialog({ code: item.itemCode })}
                className="p-1.5 rounded-md hover:bg-muted text-blue-600"
                title="Assign"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setResolveDialog({ code: item.itemCode })}
                className="p-1.5 rounded-md hover:bg-muted text-green-600"
                title="Resolve"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              {item.status !== 'ESCALATED' && (
                <button
                  onClick={() => escalateItem.mutate(item.itemCode)}
                  className="p-1.5 rounded-md hover:bg-muted text-red-600"
                  title="Escalate"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [escalateItem],
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Open Items & Exceptions"
        subtitle="Aging item exception management and resolution tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Item
          </button>
        }
      />

      <div className="px-6 py-4 space-y-6">
        {/* Aging Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Open" value={totalOpen} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="0-30 Days" value={bucket030} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="31-60 Days" value={bucket3160} format="number" icon={Clock} loading={isLoading} />
          <StatCard label=">60 Days" value={bucket60plus} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        {/* Aging BarChart */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Aging Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select className="ml-2 input text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="RECON_BREAK">Recon Break</option>
              <option value="UNMATCHED_TXN">Unmatched Txn</option>
              <option value="SUSPENSE">Suspense</option>
              <option value="EXCEPTION">Exception</option>
              <option value="INVESTIGATION">Investigation</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <select className="ml-2 input text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="ALL">All</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select className="ml-2 input text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
            <input
              className="ml-2 input text-sm w-40"
              placeholder="Search assignee..."
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            />
          </div>
        </div>

        {/* DataTable */}
        <DataTable columns={columns} data={filteredItems} isLoading={isLoading} pageSize={15} emptyMessage="No open items found" />
      </div>

      {/* Create Item Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Create Open Item</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createItem.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <select
                  className="w-full mt-1 input"
                  value={createForm.itemType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, itemType: e.target.value as ItemType }))}
                >
                  <option value="RECON_BREAK">Recon Break</option>
                  <option value="UNMATCHED_TXN">Unmatched Transaction</option>
                  <option value="SUSPENSE">Suspense</option>
                  <option value="EXCEPTION">Exception</option>
                  <option value="INVESTIGATION">Investigation</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  className="w-full mt-1 input min-h-[80px]"
                  placeholder="Describe the item..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 input"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Currency</label>
                  <select
                    className="w-full mt-1 input"
                    value={createForm.currency}
                    onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
                  >
                    {['NGN', 'USD', 'EUR', 'GBP', 'ZAR', 'GHS', 'KES'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <select
                    className="w-full mt-1 input"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Related Reference</label>
                  <input
                    className="w-full mt-1 input"
                    placeholder="Optional"
                    value={createForm.relatedRef}
                    onChange={(e) => setCreateForm((f) => ({ ...f, relatedRef: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItem.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createItem.isPending ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Dialog */}
      {assignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => { setAssignDialog(null); setAssignForm({ assignedTo: '', assignedTeam: '' }); }} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Assign Item</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                assignItem.mutate({ code: assignDialog.code, data: assignForm });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assignee Name</label>
                <input
                  className="w-full mt-1 input"
                  placeholder="e.g., John Smith"
                  value={assignForm.assignedTo}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Team</label>
                <input
                  className="w-full mt-1 input"
                  placeholder="e.g., Reconciliation Team"
                  value={assignForm.assignedTeam}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assignedTeam: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setAssignDialog(null); setAssignForm({ assignedTo: '', assignedTeam: '' }); }} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignItem.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {assignItem.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Dialog */}
      {resolveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => { setResolveDialog(null); setResolveForm({ resolutionNotes: '', resolutionAction: 'CORRECTED' }); }} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Resolve Item</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resolveForm.resolutionNotes.trim()) return;
                resolveDialog && resolveItem.mutate({ code: resolveDialog.code, data: resolveForm });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resolution Type</label>
                <select
                  className="w-full mt-1 input"
                  value={resolveForm.resolutionAction}
                  onChange={(e) => setResolveForm((f) => ({ ...f, resolutionAction: e.target.value as ResolutionType }))}
                >
                  <option value="CORRECTED">Corrected</option>
                  <option value="WRITTEN_OFF">Written Off</option>
                  <option value="REVERSED">Reversed</option>
                  <option value="RECLASSIFIED">Reclassified</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resolution Notes (required)</label>
                <textarea
                  className="w-full mt-1 input min-h-[100px]"
                  placeholder="Provide resolution details..."
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setResolveDialog(null); setResolveForm({ resolutionNotes: '', resolutionAction: 'CORRECTED' }); }} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveItem.isPending || !resolveForm.resolutionNotes.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {resolveItem.isPending ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
