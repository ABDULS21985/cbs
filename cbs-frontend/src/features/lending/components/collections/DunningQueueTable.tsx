import type { MouseEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/stores/authStore';
import { useLogCollectionAction } from '../../hooks/useCollections';
import type { DunningQueueItem } from '../../types/collections';

interface DunningQueueTableProps {
  data?: DunningQueueItem[];
  isLoading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  SMS: 'bg-sky-100 text-sky-800',
  EMAIL: 'bg-indigo-100 text-indigo-800',
  CALL: 'bg-amber-100 text-amber-800',
  LETTER: 'bg-orange-100 text-orange-800',
  LEGAL_NOTICE: 'bg-rose-100 text-rose-800',
};

function ActionButtons({ item }: { item: DunningQueueItem }) {
  const logAction = useLogCollectionAction();
  const user = useAuthStore((state) => state.user);
  const isPending = logAction.isPending;

  const log = (event: MouseEvent<HTMLButtonElement>, actionType: string, description: string) => {
    event.stopPropagation();
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
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={(event) => log(event, 'PROMISE_TO_PAY', `Promise to pay from dunning queue for loan ${item.loanNumber}`)}
        disabled={isPending}
        className="rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
      >
        Promise to Pay
      </button>
      <button
        type="button"
        onClick={(event) => log(event, 'PHONE_CALL', `Phone call attempt - no answer for loan ${item.loanNumber}`)}
        disabled={isPending}
        className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        No Answer
      </button>
      <button
        type="button"
        onClick={(event) => log(event, 'SMS', `SMS sent for loan ${item.loanNumber}`)}
        disabled={isPending}
        className="rounded-full border border-sky-300/70 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
      >
        SMS Sent
      </button>
      <button
        type="button"
        onClick={(event) => log(event, 'NOTE', `Skipped dunning for loan ${item.loanNumber}`)}
        disabled={isPending}
        className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        Skip
      </button>
    </div>
  );
}

const columns: ColumnDef<DunningQueueItem>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'dpd',
    header: 'DPD',
    cell: ({ row }) => <span className="font-semibold text-rose-600">{row.original.dpd}d</span>,
  },
  {
    accessorKey: 'nextAction',
    header: 'Next Action',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[row.original.nextAction] ?? 'bg-gray-100 text-gray-800'}`}>
        {row.original.nextAction.replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone}</span>,
  },
  {
    accessorKey: 'outcome',
    header: 'Outcome',
    cell: ({ row }) =>
      row.original.outcome ? (
        <span className="text-sm text-muted-foreground">{row.original.outcome}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <ActionButtons item={row.original} />,
  },
];

export function DunningQueueTable({ data = [], isLoading }: DunningQueueTableProps) {
  const legalQueue = data.filter((item) => item.nextAction === 'LEGAL_NOTICE').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Execution Queue</p>
          <h3 className="mt-2 text-lg font-semibold">Dunning Queue</h3>
          <p className="mt-1 text-sm text-muted-foreground">Operational queue for borrower contact attempts and escalations due today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="lending-hero-chip">{data.length} queued</div>
          <div className="lending-hero-chip">{legalQueue} legal notices</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No items in dunning queue"
        pageSize={15}
      />
    </div>
  );
}
