import { useState, useMemo } from 'react';
import { Ban, RotateCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import { FeeWaiverForm } from './FeeWaiverForm';
import { waiveFee, reverseFeeCharge, type FeeCharge } from '../api/feeApi';
import { STATUS_COLORS } from '@/types/common';

const FEE_STATUS_COLORS: Record<string, string> = {
  ...STATUS_COLORS,
  CHARGED: 'success',
  WAIVED: 'info',
  PENDING: 'warning',
  REVERSED: 'default',
};

const STATUS_FILTERS = ['ALL', 'CHARGED', 'WAIVED', 'PENDING', 'REVERSED'] as const;

interface FeeChargeHistoryTableProps {
  charges: FeeCharge[];
  onWaive?: (charge: FeeCharge) => void;
}

export function FeeChargeHistoryTable({ charges, onWaive }: FeeChargeHistoryTableProps) {
  const [waiverCharge, setWaiverCharge] = useState<FeeCharge | null>(null);
  const [reverseTarget, setReverseTarget] = useState<FeeCharge | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const qc = useQueryClient();

  const waiveMutation = useMutation({
    mutationFn: ({ chargeId, waivedBy, reason }: { chargeId: string; waivedBy: string; reason: string }) =>
      waiveFee(chargeId, waivedBy, reason),
    onSuccess: () => {
      toast.success('Fee waived successfully');
      qc.invalidateQueries({ queryKey: ['fee-charge-history'] });
      setWaiverCharge(null);
    },
    onError: () => toast.error('Failed to waive fee'),
  });

  const reverseMutation = useMutation({
    mutationFn: (chargeId: string) => reverseFeeCharge(chargeId),
    onSuccess: () => {
      toast.success('Fee charge reversed');
      qc.invalidateQueries({ queryKey: ['fee-charge-history'] });
      setReverseTarget(null);
    },
    onError: () => toast.error('Failed to reverse charge'),
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = charges;
    if (statusFilter !== 'ALL') result = result.filter((c) => c.status === statusFilter);
    if (dateFrom) result = result.filter((c) => c.date >= dateFrom);
    if (dateTo) result = result.filter((c) => c.date <= dateTo + 'T23:59:59');
    return result;
  }, [charges, statusFilter, dateFrom, dateTo]);

  // Summary calculations
  const totalCharges = filtered.reduce((s, c) => s + c.amount, 0);
  const totalVat = filtered.reduce((s, c) => s + c.vatAmount, 0);
  const totalWaived = filtered.filter((c) => c.status === 'WAIVED').reduce((s, c) => s + c.amount + c.vatAmount, 0);
  const netRevenue = totalCharges + totalVat - totalWaived;

  const handleWaiverSubmit = (data: { reason: string; amount: number; requestedBy: string }) => {
    if (waiverCharge) {
      waiveMutation.mutate({ chargeId: waiverCharge.id, waivedBy: data.requestedBy, reason: data.reason });
      onWaive?.(waiverCharge);
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Account', 'Customer', 'Fee', 'Amount', 'VAT', 'Status'];
    const rows = filtered.map((c) => [c.date, c.accountNumber, c.customerName, c.feeName, c.amount, c.vatAmount, c.status]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fee-charge-history.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const columns: ColumnDef<FeeCharge, any>[] = [
    {
      accessorKey: 'date', header: 'Date',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground whitespace-nowrap">{new Date(getValue<string>()).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    {
      accessorKey: 'accountNumber', header: 'Account',
      cell: ({ getValue }) => <p className="text-sm font-mono font-medium">{getValue<string>()}</p>,
    },
    {
      accessorKey: 'customerName', header: 'Customer',
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'feeName', header: 'Fee Name',
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'amount', header: 'Amount',
      cell: ({ getValue }) => <span className="text-sm font-medium tabular-nums">₦{getValue<number>().toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: 'vatAmount', header: 'VAT',
      cell: ({ getValue }) => { const vat = getValue<number>(); return <span className="text-sm text-muted-foreground tabular-nums">{vat > 0 ? `₦${vat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}</span>; },
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const charge = row.original;
        if (charge.status !== 'CHARGED') return null;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setWaiverCharge(charge); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20"
            >
              <Ban className="w-3 h-3" /> Waive
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setReverseTarget(charge); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:bg-red-900/20"
            >
              <RotateCw className="w-3 h-3" /> Reverse
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Filters + Export */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/40',
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 px-2 text-xs rounded-lg border bg-background" placeholder="From" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 px-2 text-xs rounded-lg border bg-background" placeholder="To" />
        </div>

        {/* Export */}
        <button onClick={handleExport} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total Charges</p>
          <p className="text-sm font-bold tabular-nums">₦{totalCharges.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total VAT</p>
          <p className="text-sm font-bold tabular-nums">₦{totalVat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total Waived</p>
          <p className="text-sm font-bold tabular-nums text-amber-600">₦{totalWaived.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Net Revenue</p>
          <p className="text-sm font-bold tabular-nums text-green-600">₦{netRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={filtered} enableGlobalFilter emptyMessage="No charge history found" />

      {/* Waiver Form Dialog */}
      {waiverCharge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <FeeWaiverForm charge={waiverCharge} onSubmit={handleWaiverSubmit} onCancel={() => setWaiverCharge(null)} isSubmitting={waiveMutation.isPending} />
          </div>
        </div>
      )}

      {/* Reverse Confirm Dialog */}
      {reverseTarget && (
        <ConfirmDialog
          title="Reverse Fee Charge"
          description={`Reverse this charge of ₦${(reverseTarget.amount + reverseTarget.vatAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}? This will credit the customer's account.`}
          confirmLabel="Reverse Charge"
          variant="destructive"
          onConfirm={() => reverseMutation.mutate(reverseTarget.id)}
          onCancel={() => setReverseTarget(null)}
        />
      )}
    </>
  );
}
