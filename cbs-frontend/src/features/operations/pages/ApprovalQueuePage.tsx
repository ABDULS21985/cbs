import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, X, CheckSquare, Square } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { useWorkflowTasks, useCompleteTask } from '../hooks/useWorkflowTasks';
import type { WorkflowTask, TaskStatus, TaskPriority } from '../api/workflowApi';
import { formatDate } from '@/lib/formatters';

// ─── Priority helpers ──────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  );
}

function ageDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

// ─── Action Dialog ─────────────────────────────────────────────────────────────

interface ActionDialogProps {
  task: WorkflowTask | null;
  action: 'APPROVE' | 'REJECT' | null;
  onClose: () => void;
  onConfirm: (id: string, decision: 'APPROVE' | 'REJECT', comments?: string) => void;
  isLoading: boolean;
}

function ActionDialog({ task, action, onClose, onConfirm, isLoading }: ActionDialogProps) {
  const [comments, setComments] = useState('');

  if (!task || !action) return null;

  const isApprove = action === 'APPROVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <h2 className="text-base font-semibold">{isApprove ? 'Approve' : 'Reject'} Task</h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{task.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {task.taskType.replace(/_/g, ' ')} · Requested by {task.requestor}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Comments {!isApprove && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="input w-full h-24 resize-none"
              placeholder={isApprove ? 'Optional approval notes...' : 'Reason for rejection (required)'}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={() => onConfirm(task.id, action, comments || undefined)}
              disabled={isLoading || (!isApprove && !comments.trim())}
              className={isApprove ? 'btn-primary' : 'px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors'}
            >
              {isLoading ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab types ─────────────────────────────────────────────────────────────────

type FilterTab = 'MY_QUEUE' | 'ALL_PENDING' | 'COMPLETED_TODAY';

const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'MY_QUEUE', label: 'My Queue' },
  { key: 'ALL_PENDING', label: 'All Pending' },
  { key: 'COMPLETED_TODAY', label: 'Completed Today' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ApprovalQueuePage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('MY_QUEUE');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionTask, setActionTask] = useState<WorkflowTask | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const statusFilter: TaskStatus | undefined =
    activeTab === 'MY_QUEUE' || activeTab === 'ALL_PENDING' ? 'PENDING' : 'COMPLETED';

  const { data: tasksPage, isLoading } = useWorkflowTasks({
    status: statusFilter,
    size: 50,
  });

  const completeTask = useCompleteTask();

  const tasks = tasksPage?.content ?? [];

  // Sort by priority: HIGH first
  const sortedTasks = [...tasks].sort((a, b) => {
    const order: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.priority] - order[b.priority];
  });

  const myPending = tasks.filter((t) => t.status === 'PENDING').length;
  const allPending = tasks.filter((t) => t.status === 'PENDING').length;
  const approvedToday = tasks.filter((t) => {
    if (t.status !== 'COMPLETED') return false;
    return t.completedAt ? new Date(t.completedAt).toDateString() === new Date().toDateString() : false;
  }).length;
  const rejectedToday = tasks.filter((t) => {
    if (t.status !== 'REJECTED') return false;
    return t.completedAt ? new Date(t.completedAt).toDateString() === new Date().toDateString() : false;
  }).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const pendingIds = sortedTasks.filter((t) => t.status === 'PENDING').map((t) => t.id);
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleAction = (task: WorkflowTask, type: 'APPROVE' | 'REJECT') => {
    setActionTask(task);
    setActionType(type);
  };

  const handleConfirm = (id: string, decision: 'APPROVE' | 'REJECT', comments?: string) => {
    completeTask.mutate(
      { id, payload: { decision, comments } },
      {
        onSuccess: () => {
          setActionTask(null);
          setActionType(null);
        },
      }
    );
  };

  const handleBulkApprove = () => {
    Promise.all(
      selectedIds.map((id) =>
        completeTask.mutateAsync({ id, payload: { decision: 'APPROVE', comments: 'Bulk approved' } })
      )
    ).then(() => {
      setSelectedIds([]);
      setShowBulkConfirm(false);
    });
  };

  const pendingIds = sortedTasks.filter((t) => t.status === 'PENDING').map((t) => t.id);
  const allSelected = pendingIds.length > 0 && selectedIds.length === pendingIds.length;

  return (
    <>
      <PageHeader
        title="Approval Queue"
        subtitle="Pending workflow approvals"
      />
      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="My Pending" value={myPending} loading={isLoading} />
          <StatCard label="All Pending" value={allPending} loading={isLoading} />
          <StatCard label="Approved Today" value={approvedToday} />
          <StatCard label="Rejected Today" value={rejectedToday} />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSelectedIds([]); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <span className="text-sm font-medium">{selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Bulk Approve
            </button>
            <button onClick={() => setSelectedIds([])} className="text-sm text-muted-foreground hover:text-foreground">
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    {activeTab !== 'COMPLETED_TODAY' && (
                      <button onClick={toggleAll}>
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requestor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requested At</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Age</th>
                  {activeTab !== 'COMPLETED_TODAY' && (
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No tasks in this queue</p>
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const age = ageDays(task.createdAt);
                    const isSelected = selectedIds.includes(task.id);
                    return (
                      <tr key={task.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-3">
                          {task.status === 'PENDING' && (
                            <button onClick={() => toggleSelect(task.id)}>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{task.id.slice(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                            {task.taskType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm truncate max-w-[200px] block">{task.description}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{task.requestor}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(task.createdAt)}</td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${age > 2 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                            {age === 0 ? 'Today' : `${age}d`}
                          </span>
                        </td>
                        {activeTab !== 'COMPLETED_TODAY' && (
                          <td className="px-4 py-3">
                            {task.status === 'PENDING' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAction(task, 'APPROVE')}
                                  className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleAction(task, 'REJECT')}
                                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      <ActionDialog
        task={actionTask}
        action={actionType}
        onClose={() => { setActionTask(null); setActionType(null); }}
        onConfirm={handleConfirm}
        isLoading={completeTask.isPending}
      />

      {/* Bulk Confirm */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowBulkConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-card rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">Bulk Approve {selectedIds.length} Tasks?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will approve all {selectedIds.length} selected tasks. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkConfirm(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleBulkApprove} className="btn-primary" disabled={completeTask.isPending}>
                {completeTask.isPending ? 'Approving...' : 'Approve All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
