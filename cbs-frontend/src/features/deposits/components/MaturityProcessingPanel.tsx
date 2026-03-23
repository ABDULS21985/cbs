import { useState, useMemo } from 'react';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Loader2, RotateCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { FixedDeposit } from '../api/fixedDepositApi';
import { useAllFixedDeposits, useBatchProcessMaturity } from '../hooks/useFixedDeposits';
import { toast } from 'sonner';

interface BatchResult {
  processed: number;
  rolledOver: number;
  liquidated: number;
  failed: number;
}

export function MaturityProcessingPanel() {
  const { data: allFds = [], isLoading } = useAllFixedDeposits();
  const batchProcess = useBatchProcessMaturity();
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const maturedFds = useMemo(() =>
    allFds.filter((fd) => fd.status === 'ACTIVE' && fd.maturityDate <= today),
    [allFds, today],
  );

  const byInstruction = useMemo(() => ({
    ROLLOVER_ALL: maturedFds.filter((fd) => fd.maturityInstruction === 'ROLLOVER_ALL').length,
    ROLLOVER_PRINCIPAL: maturedFds.filter((fd) => fd.maturityInstruction === 'ROLLOVER_PRINCIPAL').length,
    LIQUIDATE: maturedFds.filter((fd) => fd.maturityInstruction === 'LIQUIDATE').length,
    MANUAL: maturedFds.filter((fd) => fd.maturityInstruction === 'MANUAL').length,
  }), [maturedFds]);

  const totalValue = maturedFds.reduce((s, fd) => s + fd.maturityValue, 0);

  const handleProcess = () => {
    batchProcess.mutate(undefined, {
      onSuccess: (data) => { setResult(data); setShowConfirm(false); toast.success(`Processed ${data.processed} matured deposits`); },
      onError: () => toast.error('Maturity processing failed'),
    });
  };

  const columns: ColumnDef<FixedDeposit, any>[] = [
    { accessorKey: 'fdNumber', header: 'FD #', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.fdNumber}</span> },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <span className="text-sm">{row.original.customerName}</span> },
    { accessorKey: 'principalAmount', header: 'Principal', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.principalAmount, row.original.currency)}</span> },
    { accessorKey: 'interestRate', header: 'Rate', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.interestRate.toFixed(2)}%</span> },
    { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => <span className="text-xs tabular-nums">{formatDate(row.original.maturityDate)}</span> },
    {
      accessorKey: 'maturityInstruction', header: 'Instruction',
      cell: ({ row }) => (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
          row.original.maturityInstruction === 'MANUAL' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          row.original.maturityInstruction === 'LIQUIDATE' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        )}>
          {row.original.maturityInstruction.replace(/_/g, ' ')}
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  return (
    <div className="space-y-6">
      {/* Pre-run Summary */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4">Maturity Processing Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{maturedFds.length}</p>
            <p className="text-xs text-muted-foreground">Total Matured</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-green-600">{byInstruction.ROLLOVER_ALL}</p>
            <p className="text-xs text-muted-foreground">Rollover All</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-blue-600">{byInstruction.ROLLOVER_PRINCIPAL}</p>
            <p className="text-xs text-muted-foreground">Rollover Principal</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{byInstruction.LIQUIDATE}</p>
            <p className="text-xs text-muted-foreground">Liquidate</p>
          </div>
          <div className="text-center">
            <p className={cn('text-2xl font-bold tabular-nums', byInstruction.MANUAL > 0 && 'text-amber-600')}>{byInstruction.MANUAL}</p>
            <p className="text-xs text-muted-foreground">Manual Action</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">Total maturity value: <span className="font-bold">{formatMoney(totalValue)}</span></p>
      </div>

      {/* Result Card */}
      {result && (
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Processing Complete</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Processed</p><p className="font-bold tabular-nums">{result.processed}</p></div>
            <div><p className="text-xs text-muted-foreground">Rolled Over</p><p className="font-bold tabular-nums text-green-600">{result.rolledOver}</p></div>
            <div><p className="text-xs text-muted-foreground">Liquidated</p><p className="font-bold tabular-nums">{result.liquidated}</p></div>
            <div><p className="text-xs text-muted-foreground">Failed</p><p className={cn('font-bold tabular-nums', result.failed > 0 && 'text-red-600')}>{result.failed}</p></div>
          </div>
        </div>
      )}

      {/* Action */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={maturedFds.length === 0 || batchProcess.isPending}
        className="flex items-center gap-2 btn-primary"
      >
        {batchProcess.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
        {batchProcess.isPending ? 'Processing...' : `Process All Matured (${maturedFds.length})`}
      </button>

      {/* Table */}
      <DataTable columns={columns} data={maturedFds} isLoading={isLoading} enableGlobalFilter emptyMessage="No matured deposits pending processing" />

      {showConfirm && (
        <ConfirmDialog
          title="Process Matured Deposits"
          description={`Process ${maturedFds.length} matured deposits totalling ${formatMoney(totalValue)}? This will execute all maturity instructions.`}
          confirmLabel="Process All"
          onConfirm={handleProcess}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
