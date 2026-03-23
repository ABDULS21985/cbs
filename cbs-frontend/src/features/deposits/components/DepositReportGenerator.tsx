import { useState, useMemo } from 'react';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { FileText, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { FixedDeposit } from '../api/fixedDepositApi';
import { useAllFixedDeposits } from '../hooks/useFixedDeposits';
import { toast } from 'sonner';

type ReportType = 'PORTFOLIO' | 'MATURITY' | 'RATE' | 'CONCENTRATION' | 'ROLLOVER';

const REPORTS: { type: ReportType; label: string; description: string }[] = [
  { type: 'PORTFOLIO', label: 'Portfolio Summary', description: 'Overview of all active fixed deposits' },
  { type: 'MATURITY', label: 'Maturity Schedule', description: 'FDs grouped by maturity date' },
  { type: 'RATE', label: 'Rate Analysis', description: 'Distribution of rates across portfolio' },
  { type: 'CONCENTRATION', label: 'Customer Concentration', description: 'Top customers by deposit value' },
  { type: 'ROLLOVER', label: 'Rollover Report', description: 'Rolled over vs liquidated deposits' },
];

export function DepositReportGenerator() {
  const { data: allFds = [], isLoading } = useAllFixedDeposits();
  const [reportType, setReportType] = useState<ReportType>('PORTFOLIO');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let result = allFds;
    if (statusFilter) result = result.filter((fd) => fd.status === statusFilter);
    if (dateFrom) result = result.filter((fd) => fd.startDate >= dateFrom);
    if (dateTo) result = result.filter((fd) => fd.maturityDate <= dateTo);
    return result;
  }, [allFds, statusFilter, dateFrom, dateTo]);

  const reportData = useMemo(() => {
    switch (reportType) {
      case 'PORTFOLIO':
        return filtered;
      case 'MATURITY':
        return [...filtered].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
      case 'RATE':
        return [...filtered].sort((a, b) => b.interestRate - a.interestRate);
      case 'CONCENTRATION': {
        const map = new Map<string, { customer: string; count: number; total: number }>();
        filtered.forEach((fd) => {
          const existing = map.get(fd.customerName) || { customer: fd.customerName, count: 0, total: 0 };
          existing.count++;
          existing.total += fd.principalAmount;
          map.set(fd.customerName, existing);
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
      }
      case 'ROLLOVER': {
        const rolledOver = allFds.filter((fd) => fd.status === 'ROLLED_OVER').length;
        const matured = allFds.filter((fd) => fd.status === 'MATURED').length;
        const liquidated = allFds.filter((fd) => fd.status === 'LIQUIDATED').length;
        return [
          { category: 'Rolled Over', count: rolledOver },
          { category: 'Matured (Not Rolled)', count: matured },
          { category: 'Liquidated', count: liquidated },
        ];
      }
      default:
        return filtered;
    }
  }, [reportType, filtered, allFds]);

  const portfolioCols: ColumnDef<FixedDeposit, any>[] = [
    { accessorKey: 'fdNumber', header: 'FD #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.fdNumber}</span> },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'principalAmount', header: 'Principal', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.principalAmount, row.original.currency)}</span> },
    { accessorKey: 'interestRate', header: 'Rate', cell: ({ row }) => <span className="tabular-nums">{row.original.interestRate.toFixed(2)}%</span> },
    { accessorKey: 'tenor', header: 'Tenor', cell: ({ row }) => <span>{row.original.tenor}d</span> },
    { accessorKey: 'startDate', header: 'Start', cell: ({ row }) => <span className="text-xs tabular-nums">{formatDate(row.original.startDate)}</span> },
    { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => <span className="text-xs tabular-nums">{formatDate(row.original.maturityDate)}</span> },
    { accessorKey: 'maturityInstruction', header: 'Instruction', cell: ({ row }) => <span className="text-xs">{row.original.maturityInstruction.replace(/_/g, ' ')}</span> },
    { accessorKey: 'status', header: 'Status' },
  ];

  const handleExportCsv = () => {
    if (reportType === 'PORTFOLIO' || reportType === 'MATURITY' || reportType === 'RATE') {
      const data = reportData as FixedDeposit[];
      const headers = ['FD#', 'Customer', 'Principal', 'Rate', 'Tenor', 'Start', 'Maturity', 'Instruction', 'Status'];
      const rows = data.map((fd) => [fd.fdNumber, fd.customerName, fd.principalAmount, fd.interestRate, fd.tenor, fd.startDate, fd.maturityDate, fd.maturityInstruction, fd.status]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fd-report-${reportType.toLowerCase()}.csv`; a.click();
      toast.success('CSV exported');
    }
  };

  const handlePrint = () => window.print();

  const totalPrincipal = (reportData as FixedDeposit[]).reduce?.((s: number, fd: any) => s + (fd.principalAmount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.type}
            onClick={() => setReportType(r.type)}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              reportType === r.type ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/30',
            )}
          >
            <p className="text-xs font-medium">{r.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{r.description}</p>
          </button>
        ))}
      </div>

      {/* Parameters */}
      <div className="flex flex-wrap items-end gap-3 surface-card p-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background">
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="MATURED">Matured</option>
            <option value="LIQUIDATED">Liquidated</option>
            <option value="ROLLED_OVER">Rolled Over</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Summary */}
      {(reportType === 'PORTFOLIO' || reportType === 'MATURITY' || reportType === 'RATE') && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">{(reportData as FixedDeposit[]).length} deposits</span>
          <span className="mx-2">|</span>
          <span className="font-medium">{formatMoney(totalPrincipal)} total principal</span>
        </div>
      )}

      {/* Report Preview */}
      {reportType === 'CONCENTRATION' ? (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">FDs</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total Value</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">% of Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(reportData as { customer: string; count: number; total: number }[]).slice(0, 20).map((row, i) => (
                <tr key={row.customer} className="hover:bg-muted/20">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{row.customer}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatMoney(row.total)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{totalPrincipal > 0 ? ((row.total / totalPrincipal) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : reportType === 'ROLLOVER' ? (
        <div className="grid grid-cols-3 gap-4">
          {(reportData as { category: string; count: number }[]).map((row) => (
            <div key={row.category} className="surface-card p-5 text-center">
              <p className="text-2xl font-bold tabular-nums">{row.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.category}</p>
            </div>
          ))}
        </div>
      ) : (
        <DataTable columns={portfolioCols} data={reportData as FixedDeposit[]} isLoading={isLoading} enableGlobalFilter enableExport exportFilename={`fd-${reportType.toLowerCase()}`} emptyMessage="No data for this report" />
      )}
    </div>
  );
}
