import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate, formatMoney } from '@/lib/formatters';
import { useAssignAlert, useEscalateAlert, useDismissAlert } from '../../hooks/useAmlAlerts';
import type { ColumnDef } from '@tanstack/react-table';
import type { AmlAlert, AlertPriority } from '../../types/aml';

interface Props {
  data: AmlAlert[];
  isLoading?: boolean;
}

const priorityClass = (priority: AlertPriority) => {
  if (priority === 'CRITICAL')
    return 'bg-red-50 text-red-700 animate-pulse font-semibold';
  if (priority === 'HIGH') return 'bg-red-50 text-red-700';
  if (priority === 'MEDIUM') return 'bg-amber-50 text-amber-700';
  return 'bg-blue-50 text-blue-700';
};

interface DismissInlineProps {
  alertId: number;
  onClose: () => void;
}

function DismissInline({ alertId, onClose }: DismissInlineProps) {
  const [reason, setReason] = useState('');
  const dismiss = useDismissAlert();

  const handleDismiss = () => {
    if (!reason.trim()) return;
    dismiss.mutate({ id: alertId, reason }, { onSuccess: onClose });
  };

  return (
    <div
      className="flex items-center gap-2 mt-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason…"
        className="text-xs border rounded px-2 py-1 w-32 bg-background"
      />
      <button
        onClick={handleDismiss}
        disabled={!reason.trim() || dismiss.isPending}
        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
      >
        {dismiss.isPending ? '…' : 'Confirm'}
      </button>
      <button
        onClick={onClose}
        className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export function AlertQueueTable({ data, isLoading }: Props) {
  const navigate = useNavigate();
  const assign = useAssignAlert();
  const escalate = useEscalateAlert();
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const columns: ColumnDef<AmlAlert>[] = [
    {
      accessorKey: 'alertNumber',
      header: 'Alert #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.customerName}</p>
          <p className="text-xs text-muted-foreground">{row.original.customerNumber}</p>
        </div>
      ),
    },
    {
      accessorKey: 'alertType',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {getValue<string>().replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'riskScore',
      header: 'Score',
      cell: ({ getValue }) => {
        const score = getValue<number>();
        const color =
          score >= 80 ? 'text-red-600' : score >= 60 ? 'text-amber-600' : 'text-green-600';
        return <span className={cn('text-sm font-semibold', color)}>{score}</span>;
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm">{formatMoney(row.original.amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => {
        const p = getValue<AlertPriority>();
        return (
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', priorityClass(p))}>
            {p}
          </span>
        );
      },
    },
    {
      accessorKey: 'ageDays',
      header: 'Age',
      cell: ({ row }) => {
        const { ageDays, slaDays } = row.original;
        const breached = ageDays > slaDays;
        return (
          <span className={cn('text-sm', breached ? 'text-red-600 font-medium' : '')}>
            {ageDays}d
            {breached && <span className="ml-1 text-xs">⚠ SLA</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {getValue<string>().replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const alert = row.original;
        const isDismissing = dismissingId === alert.id;

        return (
          <div
            className="flex flex-col gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1">
              <button
                onClick={() => assign.mutate(alert.id)}
                disabled={assign.isPending}
                className="text-xs px-2 py-0.5 rounded border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => escalate.mutate({ id: alert.id, reason: 'Escalated from queue' })}
                disabled={escalate.isPending}
                className="text-xs px-2 py-0.5 rounded border text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                Escalate
              </button>
              <button
                onClick={() => setDismissingId(isDismissing ? null : alert.id)}
                className="text-xs px-2 py-0.5 rounded border text-red-700 hover:bg-red-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
            {isDismissing && (
              <DismissInline
                alertId={alert.id}
                onClose={() => setDismissingId(null)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={(row) => navigate(`/risk/aml/${row.id}`)}
      enableExport
      exportFilename="aml-alert-queue"
      emptyMessage="No alerts in queue"
      pageSize={15}
      enableGlobalFilter
    />
  );
}
