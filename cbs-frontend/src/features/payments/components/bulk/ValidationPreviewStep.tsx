import { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';

import { formatMoney } from '@/lib/formatters';
import type { BulkPaymentBatch, BulkPaymentRow } from '../../api/bulkPaymentApi';

const rowColumns: ColumnDef<BulkPaymentRow, any>[] = [
  { accessorKey: 'rowNumber', header: '#', size: 50 },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => {
    const s = row.original.status;
    const Icon = s === 'VALID' ? CheckCircle : s === 'WARNING' ? AlertTriangle : XCircle;
    const color = s === 'VALID' ? 'text-green-600' : s === 'WARNING' ? 'text-amber-600' : 'text-red-600';
    return <Icon className={`w-4 h-4 ${color}`} />;
  }},
  { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
  { accessorKey: 'accountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span> },
  { accessorKey: 'bankName', header: 'Bank', cell: ({ row }) => row.original.bankName || row.original.bankCode },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.amount, 'NGN')}</span> },
  { accessorKey: 'narration', header: 'Narration' },
  { accessorKey: 'errorMessage', header: 'Error/Warning', cell: ({ row }) => <span className="text-xs text-red-600">{row.original.errorMessage || row.original.warningMessage || ''}</span> },
];

interface Props {
  batch: BulkPaymentBatch;
  onBack: () => void;
  onContinue: () => void;
}

export function ValidationPreviewStep({ batch, onBack, onContinue }: Props) {
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  const displayRows = showErrorsOnly
    ? batch.rows.filter((r) => r.status !== 'VALID')
    : batch.rows;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card"><div className="stat-label">Total Rows</div><div className="stat-value">{batch.totalRows}</div></div>
        <div className="stat-card"><div className="stat-label text-green-600">Valid</div><div className="stat-value text-green-600">{batch.validRows}</div></div>
        <div className="stat-card"><div className="stat-label text-amber-600">Warnings</div><div className="stat-value text-amber-600">{batch.warningRows}</div></div>
        <div className="stat-card"><div className="stat-label text-red-600">Errors</div><div className="stat-value text-red-600">{batch.errorRows}</div></div>
      </div>

      {/* Summary info */}
      <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-mono font-semibold">{formatMoney(batch.totalAmount, batch.currency)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Fee Estimate</span><span className="font-mono">{formatMoney(batch.feeEstimate, batch.currency)}</span></div>
        <div className="flex justify-between font-semibold"><span>Total Debit</span><span className="font-mono">{formatMoney(batch.totalAmount + batch.feeEstimate, batch.currency)}</span></div>
      </div>

      {/* Filter toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showErrorsOnly} onChange={(e) => setShowErrorsOnly(e.target.checked)} className="rounded" />
        Show errors only
      </label>

      <DataTable columns={rowColumns} data={displayRows} enableGlobalFilter pageSize={20} />

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">&larr; Re-upload</button>
        <button onClick={onContinue} disabled={batch.validRows === 0} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {batch.errorRows > 0 ? 'Remove Errors & Continue' : 'Continue'} &rarr;
        </button>
      </div>
    </div>
  );
}
