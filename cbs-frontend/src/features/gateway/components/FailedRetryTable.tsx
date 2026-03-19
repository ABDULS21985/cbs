import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Loader2, RotateCcw, XCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, ConfirmDialog } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { gatewayApi, type GatewayMessage } from '../api/gatewayApi';

interface OverrideDialogState {
  open: boolean;
  messageId: string | null;
}

interface OverrideFormState {
  action: string;
  notes: string;
}

function OverrideDialog({
  open,
  messageId,
  onClose,
}: {
  open: boolean;
  messageId: string | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<OverrideFormState>({ action: 'FORCE_SETTLE', notes: '' });
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => gatewayApi.manualOverride(messageId!, form),
    onSuccess: () => {
      toast.success('Manual override applied successfully');
      queryClient.invalidateQueries({ queryKey: ['gateway', 'messages', 'failed'] });
      onClose();
    },
    onError: () => toast.error('Failed to apply override'),
  });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md pointer-events-auto">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold">Manual Override</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Apply a manual override action to this message</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Override Action</label>
              <select
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="FORCE_SETTLE">Force Settle</option>
                <option value="FORCE_REJECT">Force Reject</option>
                <option value="MARK_PROCESSED">Mark as Processed</option>
                <option value="ESCALATE">Escalate to Ops Team</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Notes / Reason</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Provide a reason for the manual override..."
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="px-6 pb-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => mutate()}
              disabled={isPending || !form.notes.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Apply Override
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function FailedRetryTable() {
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [cancelingIds, setCancelingIds] = useState<Set<string>>(new Set());
  const [overrideState, setOverrideState] = useState<OverrideDialogState>({ open: false, messageId: null });
  const [retryAllOpen, setRetryAllOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['gateway', 'messages', 'failed'],
    queryFn: () => gatewayApi.getMessages({ status: 'FAILED' }),
    refetchInterval: 10_000,
  });

  const { mutate: retryAll, isPending: isRetryingAll } = useMutation({
    mutationFn: () => gatewayApi.retryAllFailed(),
    onSuccess: (result) => {
      toast.success(`${result.queued} message(s) queued for retry`);
      queryClient.invalidateQueries({ queryKey: ['gateway', 'messages', 'failed'] });
      setRetryAllOpen(false);
    },
    onError: () => toast.error('Failed to queue messages for retry'),
  });

  const handleRetry = async (id: string) => {
    setRetryingIds((prev) => new Set(prev).add(id));
    try {
      await gatewayApi.retryMessage(id);
      toast.success('Message queued for retry');
      queryClient.invalidateQueries({ queryKey: ['gateway', 'messages', 'failed'] });
    } catch {
      toast.error('Failed to retry message');
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCancel = async (id: string) => {
    setCancelingIds((prev) => new Set(prev).add(id));
    try {
      await gatewayApi.cancelMessage(id);
      toast.success('Message cancelled');
      queryClient.invalidateQueries({ queryKey: ['gateway', 'messages', 'failed'] });
    } catch {
      toast.error('Failed to cancel message');
    } finally {
      setCancelingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const columns: ColumnDef<GatewayMessage, any>[] = [
    {
      accessorKey: 'reference',
      header: 'Ref',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'errorCode',
      header: 'Error Code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-red-600 dark:text-red-400">{getValue<string>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error Message',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">{getValue<string>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'attempts',
      header: 'Attempts',
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>() ?? 1}</span>,
    },
    {
      accessorKey: 'lastAttempt',
      header: 'Last Attempt',
      cell: ({ getValue }) => {
        const v = getValue<string | undefined>();
        return v ? (
          <span className="text-xs text-muted-foreground">{formatDateTime(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const id = row.original.id;
        const isRetrying = retryingIds.has(id);
        const isCanceling = cancelingIds.has(id);
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(id); }}
              disabled={isRetrying || isCanceling}
              title="Retry"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
            >
              {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Retry
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(id); }}
              disabled={isRetrying || isCanceling}
              title="Cancel"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              {isCanceling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Cancel
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOverrideState({ open: true, messageId: id }); }}
              disabled={isRetrying || isCanceling}
              title="Manual Override"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
            >
              <Wrench className="w-3 h-3" />
              Override
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{data.length} failed message{data.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setRetryAllOpen(true)}
            disabled={data.length === 0 || isRetryingAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRetryingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Retry All Failed
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          enableGlobalFilter
          emptyMessage="No failed messages"
          pageSize={15}
        />
      </div>

      <ConfirmDialog
        open={retryAllOpen}
        onClose={() => setRetryAllOpen(false)}
        onConfirm={() => retryAll()}
        title="Retry All Failed Messages"
        description="Only messages with retryable error codes will be re-queued. Messages with permanent errors (e.g. invalid account, duplicate) will not be retried. Proceed?"
        confirmLabel="Retry All"
        variant="default"
        isLoading={isRetryingAll}
      />

      <OverrideDialog
        open={overrideState.open}
        messageId={overrideState.messageId}
        onClose={() => setOverrideState({ open: false, messageId: null })}
      />
    </>
  );
}
