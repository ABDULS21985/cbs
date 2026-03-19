import { useState } from 'react';
import { Ban } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { FeeWaiverForm } from './FeeWaiverForm';
import type { FeeCharge } from '../api/feeApi';
import { STATUS_COLORS } from '@/types/common';

// Extend STATUS_COLORS for fee-specific statuses
const FEE_STATUS_COLORS: Record<string, string> = {
  ...STATUS_COLORS,
  CHARGED: 'success',
  WAIVED: 'info',
  PENDING: 'warning',
  REVERSED: 'default',
};

interface FeeChargeHistoryTableProps {
  charges: FeeCharge[];
  onWaive?: (charge: FeeCharge) => void;
}

export function FeeChargeHistoryTable({ charges, onWaive }: FeeChargeHistoryTableProps) {
  const [waiverCharge, setWaiverCharge] = useState<FeeCharge | null>(null);

  const handleWaive = (charge: FeeCharge) => {
    setWaiverCharge(charge);
  };

  const handleWaiverSubmit = (data: { reason: string; amount: number; requestedBy: string }) => {
    if (waiverCharge) {
      onWaive?.(waiverCharge);
    }
    setWaiverCharge(null);
    void data; // suppress unused var warning
  };

  const columns: ColumnDef<FeeCharge, any>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(val).toLocaleDateString('en-NG', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        );
      },
    },
    {
      accessorKey: 'accountNumber',
      header: 'Account',
      cell: ({ getValue }) => (
        <div>
          <p className="text-sm font-mono font-medium">{getValue<string>()}</p>
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'feeName',
      header: 'Fee Name',
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium tabular-nums">
          ₦{getValue<number>().toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'vatAmount',
      header: 'VAT',
      cell: ({ getValue }) => {
        const vat = getValue<number>();
        return (
          <span className="text-sm text-muted-foreground tabular-nums">
            {vat > 0 ? `₦${vat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue<string>();
        const colorKey = FEE_STATUS_COLORS[status] || 'default';
        const colorClasses: Record<string, string> = {
          success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses[colorKey]}`}>
            {status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const charge = row.original;
        if (charge.status !== 'CHARGED') return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleWaive(charge);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20 hover:dark:bg-amber-900/30 transition-colors"
          >
            <Ban className="w-3 h-3" />
            Waive
          </button>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={charges}
        enableGlobalFilter
        emptyMessage="No charge history found"
      />

      {/* Waiver Form Dialog */}
      {waiverCharge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <FeeWaiverForm
              charge={waiverCharge}
              onSubmit={handleWaiverSubmit}
              onCancel={() => setWaiverCharge(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
