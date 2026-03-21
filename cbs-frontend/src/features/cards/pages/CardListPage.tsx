import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { CreditCard, ShieldCheck, ShieldX, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/formatters';
import { useCards } from '../hooks/useCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { Card } from '../types/card';
import { cn } from '@/lib/utils';

const schemeColors: Record<string, string> = { VISA: 'bg-blue-600', MASTERCARD: 'bg-red-600', VERVE: 'bg-green-600', AMEX: 'bg-indigo-600', UNIONPAY: 'bg-teal-600', LOCAL: 'bg-gray-600' };
const typeColors: Record<string, string> = { DEBIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', CREDIT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', PREPAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', VIRTUAL: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' };

const columns: ColumnDef<Card, any>[] = [
  { accessorKey: 'cardNumberMasked', header: 'Card #', cell: ({ row }) => <span className="font-mono text-sm">{row.original.cardNumberMasked}</span> },
  { accessorKey: 'customerDisplayName', header: 'Customer' },
  { accessorKey: 'cardType', header: 'Type', cell: ({ row }) => <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', typeColors[row.original.cardType])}>{row.original.cardType}</span> },
  { accessorKey: 'cardScheme', header: 'Scheme', cell: ({ row }) => (
    <span className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', schemeColors[row.original.cardScheme])} />{row.original.cardScheme}</span>
  )},
  { accessorKey: 'accountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span> },
  { accessorKey: 'expiryDate', header: 'Expiry', cell: ({ row }) => <span className="font-mono text-sm">{row.original.expiryDate}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'issueDate', header: 'Issued', cell: ({ row }) => formatDate(row.original.issueDate) },
];

export function CardListPage() {
  useEffect(() => { document.title = 'Card Management | CBS'; }, []);
  const navigate = useNavigate();
  const { data: cards = [], isLoading, isError, refetch } = useCards();

  // Ctrl+N keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/cards/request');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const active = cards.filter((c) => c.status === 'ACTIVE').length;
  const blocked = cards.filter((c) => c.status === 'BLOCKED').length;
  const pending = cards.filter((c) => c.status === 'PENDING_ACTIVATION').length;
  const expired = cards.filter((c) => c.status === 'EXPIRED').length;

  return (
    <>
      <PageHeader
        title="Card Management"
        actions={
          <button
            type="button"
            onClick={() => navigate('/cards/request')}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Request Card
          </button>
        }
      />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Cards" value={cards.length} format="number" icon={CreditCard} />
          <StatCard label="Active" value={active} format="number" icon={ShieldCheck} />
          <StatCard label="Blocked" value={blocked} format="number" icon={ShieldX} />
          <StatCard label="Pending Activation" value={pending} format="number" icon={Clock} />
          <StatCard label="Expired" value={expired} format="number" />
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm">Failed to load cards.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading cards…
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <CreditCard className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No cards found.</p>
          </div>
        ) : (
          <TabsPage syncWithUrl tabs={[
            { id: 'all', label: 'All Cards', badge: cards.length, content: <div className="p-4"><DataTable columns={columns} data={cards} enableGlobalFilter enableExport exportFilename="cards" onRowClick={(row) => navigate(`/cards/${row.id}`)} /></div> },
            { id: 'pending', label: 'Pending Activation', badge: pending, content: <div className="p-4"><DataTable columns={columns} data={cards.filter((c) => c.status === 'PENDING_ACTIVATION')} /></div> },
            { id: 'blocked', label: 'Blocked', badge: blocked, content: <div className="p-4"><DataTable columns={columns} data={cards.filter((c) => c.status === 'BLOCKED')} /></div> },
          ]} />
        )}
      </div>
    </>
  );
}
