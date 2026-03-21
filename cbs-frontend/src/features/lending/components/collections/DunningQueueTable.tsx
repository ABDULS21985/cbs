import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { useLogCollectionAction } from '../../hooks/useCollections';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import type { DunningQueueItem } from '../../types/collections';

interface DunningQueueTableProps {
  data?: DunningQueueItem[];
  isLoading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  SMS: 'bg-blue-100 text-blue-800',
  EMAIL: 'bg-indigo-100 text-indigo-800',
  CALL: 'bg-amber-100 text-amber-800',
  LETTER: 'bg-orange-100 text-orange-800',
  LEGAL_NOTICE: 'bg-red-100 text-red-800',
};

function ActionButtons({ item }: { item: DunningQueueItem }) {
  const logAction = useLogCollectionAction();
  const user = useAuthStore((s) => s.user);
  const isPending = logAction.isPending;

  // Log action via the collection case action endpoint: POST /cases/{caseId}/actions
  const log = (actionType: string, description: string) => {
    // DunningQueueItem.id maps to the collection case ID
    logAction.mutate(
      {
        caseId: item.id,
        action: {
          actionType,
          description,
          performedBy: user?.preferred_username ?? 'system',
          contactNumber: item.phone,
        },
      },
      {
        onSuccess: () => toast.success(`${actionType.replace(/_/g, ' ')} logged for ${item.loanNumber}`),
        onError: () => toast.error('Failed to log action'),
      },
    );
  };

  return (
    <div className="flex gap-1 flex-wrap">
      <button onClick={() => log('PROMISE_TO_PAY', `Promise to pay from dunning queue for loan ${item.loanNumber}`)}
        disabled={isPending} className="px-2 py-0.5 text-xs rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
        Promise to Pay
      </button>
      <button onClick={() => log('PHONE_CALL', `Phone call attempt - no answer for loan ${item.loanNumber}`)}
        disabled={isPending} className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
        No Answer
      </button>
      <button onClick={() => log('SMS', `SMS sent for loan ${item.loanNumber}`)}
        disabled={isPending} className="px-2 py-0.5 text-xs rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50">
        SMS Sent
      </button>
      <button onClick={() => log('NOTE', `Skipped dunning for loan ${item.loanNumber}`)}
        disabled={isPending} className="px-2 py-0.5 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50">
        Skip
      </button>
    </div>
  );
}

const columns: ColumnDef<DunningQueueItem>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'dpd', header: 'DPD', cell: ({ row }) => <span className="font-semibold text-red-600">{row.original.dpd}d</span> },
  {
    accessorKey: 'nextAction', header: 'Next Action',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[row.original.nextAction] ?? 'bg-gray-100 text-gray-800'}`}>
        {row.original.nextAction.replace('_', ' ')}
      </span>
    ),
  },
  { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => formatDate(row.original.dueDate) },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone}</span> },
  {
    accessorKey: 'outcome', header: 'Outcome',
    cell: ({ row }) => row.original.outcome ? <span className="text-sm text-muted-foreground">{row.original.outcome}</span> : <span className="text-muted-foreground">—</span>,
  },
  { id: 'actions', header: 'Actions', cell: ({ row }) => <ActionButtons item={row.original} /> },
];

export function DunningQueueTable({ data = [], isLoading }: DunningQueueTableProps) {
  return (
    <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="No items in dunning queue" pageSize={15} />
  );
}
