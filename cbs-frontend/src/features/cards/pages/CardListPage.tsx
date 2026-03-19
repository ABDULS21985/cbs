import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { Plus, CreditCard, ShieldCheck, ShieldX, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/formatters';
import { mockCards } from '../api/mockCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { Card } from '../types/card';
import { cn } from '@/lib/utils';

const schemeColors: Record<string, string> = { VISA: 'bg-blue-600', MASTERCARD: 'bg-red-600', VERVE: 'bg-green-600' };
const typeColors: Record<string, string> = { DEBIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', CREDIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', PREPAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };

const columns: ColumnDef<Card, any>[] = [
  { accessorKey: 'cardNumberMasked', header: 'Card #', cell: ({ row }) => <span className="font-mono text-sm">{row.original.cardNumberMasked}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'cardType', header: 'Type', cell: ({ row }) => <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', typeColors[row.original.cardType])}>{row.original.cardType}</span> },
  { accessorKey: 'scheme', header: 'Scheme', cell: ({ row }) => (
    <span className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', schemeColors[row.original.scheme])} />{row.original.scheme}</span>
  )},
  { accessorKey: 'accountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span> },
  { accessorKey: 'expiryDate', header: 'Expiry', cell: ({ row }) => <span className="font-mono text-sm">{row.original.expiryDate}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'issuedDate', header: 'Issued', cell: ({ row }) => formatDate(row.original.issuedDate) },
];

export function CardListPage() {
  const navigate = useNavigate();
  const active = mockCards.filter((c) => c.status === 'ACTIVE').length;
  const blocked = mockCards.filter((c) => c.status === 'BLOCKED').length;
  const pending = mockCards.filter((c) => c.status === 'PENDING_ACTIVATION').length;
  const expired = mockCards.filter((c) => c.status === 'EXPIRED').length;

  return (
    <>
      <PageHeader title="Card Management" actions={
        <button onClick={() => navigate('/cards/request')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Request Card
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Cards" value={mockCards.length} format="number" icon={CreditCard} />
          <StatCard label="Active" value={active} format="number" icon={ShieldCheck} />
          <StatCard label="Blocked" value={blocked} format="number" icon={ShieldX} />
          <StatCard label="Pending Activation" value={pending} format="number" icon={Clock} />
          <StatCard label="Expired" value={expired} format="number" />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'all', label: 'All Cards', badge: mockCards.length, content: <div className="p-4"><DataTable columns={columns} data={mockCards} enableGlobalFilter enableExport exportFilename="cards" onRowClick={(row) => navigate(`/cards/${row.id}`)} /></div> },
          { id: 'pending', label: 'Pending Activation', badge: pending, content: <div className="p-4"><DataTable columns={columns} data={mockCards.filter((c) => c.status === 'PENDING_ACTIVATION')} /></div> },
          { id: 'blocked', label: 'Blocked', badge: blocked, content: <div className="p-4"><DataTable columns={columns} data={mockCards.filter((c) => c.status === 'BLOCKED')} /></div> },
        ]} />
      </div>
    </>
  );
}
