import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, TabsPage } from '@/components/shared';
import { tradeFinanceApi, type LetterOfCredit, type BankGuarantee } from '../api/tradeFinanceApi';
import { formatMoney, formatDate } from '@/lib/formatters';
import { Plus, FileText, Shield, Landmark, Clock } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const lcCols: ColumnDef<LetterOfCredit, any>[] = [
  { accessorKey: 'lcNumber', header: 'LC #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.lcNumber}</span> },
  { accessorKey: 'lcType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.lcType} /> },
  { accessorKey: 'applicantName', header: 'Applicant' },
  { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency}</span> },
  { accessorKey: 'issueDate', header: 'Issued', cell: ({ row }) => formatDate(row.original.issueDate) },
  { accessorKey: 'expiryDate', header: 'Expiry', cell: ({ row }) => formatDate(row.original.expiryDate) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const bgCols: ColumnDef<BankGuarantee, any>[] = [
  { accessorKey: 'bgNumber', header: 'BG #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.bgNumber}</span> },
  { accessorKey: 'bgType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.bgType} /> },
  { accessorKey: 'applicantName', header: 'Applicant' },
  { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'issueDate', header: 'Issued', cell: ({ row }) => formatDate(row.original.issueDate) },
  { accessorKey: 'expiryDate', header: 'Expiry', cell: ({ row }) => formatDate(row.original.expiryDate) },
  { accessorKey: 'claimStatus', header: 'Claim', cell: ({ row }) => row.original.claimStatus ? <StatusBadge status={row.original.claimStatus} /> : <span className="text-xs text-muted-foreground">None</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function TradeFinancePage() {
  const { data: lcs = [], isLoading: lcsLoading } = useQuery({ queryKey: ['trade-finance', 'lcs'], queryFn: () => tradeFinanceApi.getLcs() });
  const { data: bgs = [], isLoading: bgsLoading } = useQuery({ queryKey: ['trade-finance', 'guarantees'], queryFn: () => tradeFinanceApi.getGuarantees() });
  const { data: collections = [], isLoading: colLoading } = useQuery({ queryKey: ['trade-finance', 'collections'], queryFn: () => tradeFinanceApi.getCollections() });

  const totalOutstanding = [...lcs, ...bgs].reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <>
      <PageHeader title="Trade Finance" actions={
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New LC</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"><Plus className="w-4 h-4" /> New Guarantee</button>
        </div>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Active LCs" value={lcs.length} format="number" icon={FileText} loading={lcsLoading} />
          <StatCard label="Active Guarantees" value={bgs.length} format="number" icon={Shield} loading={bgsLoading} />
          <StatCard label="Outstanding" value={totalOutstanding} format="money" compact icon={Landmark} loading={lcsLoading || bgsLoading} />
          <StatCard label="Collections" value={collections.length} format="number" loading={colLoading} />
          <StatCard label="Expiring (30d)" value={0} format="number" icon={Clock} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'lcs', label: 'Letters of Credit', badge: lcs.length || undefined, content: (
            <div className="p-4"><DataTable columns={lcCols} data={lcs} isLoading={lcsLoading} enableGlobalFilter enableExport exportFilename="letters-of-credit" emptyMessage="No letters of credit found" /></div>
          )},
          { id: 'guarantees', label: 'Bank Guarantees', badge: bgs.length || undefined, content: (
            <div className="p-4"><DataTable columns={bgCols} data={bgs} isLoading={bgsLoading} enableGlobalFilter enableExport exportFilename="bank-guarantees" emptyMessage="No bank guarantees found" /></div>
          )},
          { id: 'collections', label: 'Documentary Collections', content: (
            <div className="p-4 text-center text-muted-foreground">{colLoading ? 'Loading...' : collections.length === 0 ? 'No documentary collections' : `${collections.length} collections`}</div>
          )},
        ]} />
      </div>
    </>
  );
}
