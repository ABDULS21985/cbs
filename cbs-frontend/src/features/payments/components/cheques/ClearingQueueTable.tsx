import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, PauseCircle, ChevronDown } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { chequeApi, type ClearingCheque, RETURN_REASON_CODES } from '../../api/chequeApi';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ChequeImageViewer } from './ChequeImageViewer';
import { ChequeReturnForm } from './ChequeReturnForm';

interface ActionState {
  type: 'clear' | 'hold';
  cheque: ClearingCheque;
}

interface ReturnDropdownState {
  chequeId: string;
  open: boolean;
}

function ReturnDropdown({
  cheque,
  onReturnWithForm,
}: {
  cheque: ClearingCheque;
  onReturnWithForm: (c: ClearingCheque) => void;
}) {
  const [open, setOpen] = useState<ReturnDropdownState>({ chequeId: cheque.id, open: false });

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => ({ ...s, open: !s.open }));
        }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
      >
        Return
        <ChevronDown className={cn('w-3 h-3 transition-transform', open.open && 'rotate-180')} />
      </button>

      {open.open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen((s) => ({ ...s, open: false }))} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-card border rounded-lg shadow-lg py-1 min-w-[200px] max-h-64 overflow-y-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen((s) => ({ ...s, open: false }));
                onReturnWithForm(cheque);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors font-medium text-muted-foreground"
            >
              Return with reason...
            </button>
            <div className="border-t my-1" />
            {RETURN_REASON_CODES.map((r) => (
              <div
                key={r.code}
                className="px-3 py-1.5 text-xs text-muted-foreground"
              >
                {r.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ClearingQueueTable() {
  const [viewCheque, setViewCheque] = useState<ClearingCheque | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionState | null>(null);
  const [returnFormCheque, setReturnFormCheque] = useState<ClearingCheque | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clearing-queue'],
    queryFn: () => chequeApi.getClearingQueue(),
    refetchInterval: 30_000,
  });

  const clearMutation = useMutation({
    mutationFn: (id: string) => chequeApi.clearCheque(id),
    onSuccess: () => {
      toast.success('Cheque cleared successfully');
      queryClient.invalidateQueries({ queryKey: ['clearing-queue'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to clear cheque');
    },
  });

  const holdMutation = useMutation({
    mutationFn: (id: string) => chequeApi.holdCheque(id, 'Under review'),
    onSuccess: () => {
      toast.success('Cheque placed on hold');
      queryClient.invalidateQueries({ queryKey: ['clearing-queue'] });
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Failed to place cheque on hold');
    },
  });

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'clear') {
      await clearMutation.mutateAsync(confirmAction.cheque.id);
    } else {
      await holdMutation.mutateAsync(confirmAction.cheque.id);
    }
  };

  const isActionPending = clearMutation.isPending || holdMutation.isPending;

  const columns: ColumnDef<ClearingCheque>[] = [
    {
      accessorKey: 'chequeNumber',
      header: 'Cheque #',
      cell: ({ row }) => <span className="font-mono text-sm font-medium">#{row.original.chequeNumber}</span>,
    },
    {
      accessorKey: 'drawerAccount',
      header: 'Drawer Account',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.drawerAccount}</span>,
    },
    {
      accessorKey: 'drawerName',
      header: 'Drawer Name',
      cell: ({ row }) => <span className="text-sm">{row.original.drawerName}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => <span className="font-mono text-sm font-semibold">{formatMoney(row.original.amount)}</span>,
    },
    {
      accessorKey: 'presentingBank',
      header: 'Presenting Bank',
      cell: ({ row }) => <span className="text-sm">{row.original.presentingBank}</span>,
    },
    {
      accessorKey: 'receivedDate',
      header: 'Received',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.receivedDate)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const cheque = row.original;
        const isPending = cheque.status === 'PENDING';
        return (
          <div
            className="flex items-center gap-1.5 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={!isPending}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: 'clear', cheque });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-3 h-3" />
              Clear
            </button>

            <ReturnDropdown
              cheque={cheque}
              onReturnWithForm={(c) => setReturnFormCheque(c)}
            />

            <button
              disabled={!isPending}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: 'hold', cheque });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PauseCircle className="w-3 h-3" />
              Hold
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Clearing Queue</h3>
        <p className="text-sm text-muted-foreground">Cheques awaiting clearing decisions. Auto-refreshes every 30 seconds.</p>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={setViewCheque}
        emptyMessage="No cheques in the clearing queue"
      />

      <ChequeImageViewer
        cheque={viewCheque}
        open={viewCheque != null}
        onClose={() => setViewCheque(null)}
      />

      <ChequeReturnForm
        cheque={returnFormCheque}
        open={returnFormCheque != null}
        onClose={() => setReturnFormCheque(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clearing-queue'] })}
      />

      <ConfirmDialog
        open={confirmAction != null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        isLoading={isActionPending}
        title={
          confirmAction?.type === 'clear'
            ? `Clear Cheque #${confirmAction.cheque.chequeNumber}`
            : `Hold Cheque #${confirmAction?.cheque.chequeNumber}`
        }
        description={
          confirmAction?.type === 'clear'
            ? `Confirm clearing of cheque #${confirmAction.cheque.chequeNumber} for ${formatMoney(confirmAction.cheque.amount)}. This action cannot be undone.`
            : `Place cheque #${confirmAction?.cheque.chequeNumber} on hold pending further review?`
        }
        confirmLabel={confirmAction?.type === 'clear' ? 'Clear Cheque' : 'Place on Hold'}
        variant={confirmAction?.type === 'clear' ? 'default' : 'default'}
      />
    </div>
  );
}
