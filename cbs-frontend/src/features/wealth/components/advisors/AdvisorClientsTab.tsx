import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatPercent, formatDate } from '@/lib/formatters';
import { DataTable, StatusBadge } from '@/components/shared';
import { useAdvisorClients, useAdvisors, useAssignAdvisor } from '../../hooks/useWealth';
import type { AdvisorClient } from '../../api/wealthApi';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, ArrowRightLeft, X, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorClientsTabProps {
  advisorId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorClientsTab({ advisorId }: AdvisorClientsTabProps) {
  const { data: clients = [], isLoading: clientsLoading } = useAdvisorClients(advisorId);
  const { data: advisors = [] } = useAdvisors();
  const assignMutation = useAssignAdvisor();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignPlanCode, setAssignPlanCode] = useState('');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferClient, setTransferClient] = useState<AdvisorClient | null>(null);
  const [targetAdvisorId, setTargetAdvisorId] = useState('');

  // Other advisors for transfer (exclude current)
  const otherAdvisors = useMemo(
    () => advisors.filter((a) => a.id !== advisorId),
    [advisors, advisorId],
  );

  // ── Assign handler ──
  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignPlanCode.trim()) return;
    await assignMutation.mutateAsync({ planCode: assignPlanCode.trim(), advisorId });
    setAssignPlanCode('');
    setShowAssignModal(false);
  }

  // ── Transfer handler ──
  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferClient || !targetAdvisorId) return;
    await assignMutation.mutateAsync({
      planCode: transferClient.planCode,
      advisorId: targetAdvisorId,
    });
    setTransferClient(null);
    setTargetAdvisorId('');
    setShowTransferModal(false);
  }

  function openTransfer(client: AdvisorClient) {
    setTransferClient(client);
    setTargetAdvisorId('');
    setShowTransferModal(true);
  }

  // ── Table columns ──
  const columns: ColumnDef<AdvisorClient, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'clientName',
        header: 'Client Name',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.clientName}</span>
        ),
      },
      {
        accessorKey: 'planCode',
        header: 'Plan Code',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.planCode}</span>
        ),
      },
      {
        accessorKey: 'planType',
        header: 'Plan Type',
        cell: ({ row }) => <StatusBadge status={row.original.planType} />,
      },
      {
        accessorKey: 'aum',
        header: 'AUM',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatMoneyCompact(row.original.aum)}</span>
        ),
      },
      {
        accessorKey: 'ytdReturn',
        header: 'YTD Return',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-mono text-sm',
              row.original.ytdReturn >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {row.original.ytdReturn >= 0 ? '+' : ''}
            {formatPercent(row.original.ytdReturn, 1)}
          </span>
        ),
      },
      {
        accessorKey: 'lastReviewDate',
        header: 'Last Review',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.lastReviewDate)}
          </span>
        ),
      },
      {
        accessorKey: 'goalStatus',
        header: 'Goal Status',
        cell: ({ row }) => <StatusBadge status={row.original.goalStatus} dot />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openTransfer(row.original);
            }}
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <ArrowRightLeft className="w-3 h-3" />
            Transfer
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Client Portfolio ({clients.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total AUM:{' '}
            <span className="font-mono font-semibold">
              {formatMoneyCompact(clients.reduce((s, c) => s + c.aum, 0))}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Assign New Client
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={clients}
        isLoading={clientsLoading}
        enableGlobalFilter
        pageSize={10}
        emptyMessage="No clients assigned to this advisor"
      />

      {/* Assign New Client Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Assign New Client</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Plan Code *
                </label>
                <input
                  required
                  type="text"
                  value={assignPlanCode}
                  onChange={(e) => setAssignPlanCode(e.target.value)}
                  placeholder="e.g. WP-2024-1001"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                    assignMutation.isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90',
                  )}
                >
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Client Modal */}
      {showTransferModal && transferClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Transfer Client</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">{transferClient.clientName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {transferClient.planCode}
                </p>
                <p className="text-xs text-muted-foreground">
                  AUM: {formatMoneyCompact(transferClient.aum)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Transfer to Advisor *
                </label>
                <select
                  required
                  value={targetAdvisorId}
                  onChange={(e) => setTargetAdvisorId(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select advisor...</option>
                  {otherAdvisors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoneyCompact(a.aum)} AUM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending || !targetAdvisorId}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                    assignMutation.isPending || !targetAdvisorId
                      ? 'opacity-70 cursor-not-allowed'
                      : 'hover:bg-primary/90',
                  )}
                >
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
