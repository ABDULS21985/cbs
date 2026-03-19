import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import { StandingOrderTable } from '../components/standing/StandingOrderTable';
import { NewStandingOrderForm } from '../components/standing/NewStandingOrderForm';
import { standingOrderApi, type DirectDebitMandate } from '../api/standingOrderApi';

const ddColumns: ColumnDef<DirectDebitMandate, any>[] = [
  { accessorKey: 'mandateRef', header: 'Mandate Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.mandateRef}</span> },
  { accessorKey: 'creditorName', header: 'Creditor' },
  { accessorKey: 'accountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span> },
  { accessorKey: 'maxAmount', header: 'Max Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.maxAmount, row.original.currency)}</span> },
  { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-xs">{row.original.frequency.replace(/_/g, ' ')}</span> },
  { accessorKey: 'lastDebit', header: 'Last Debit', cell: ({ row }) => row.original.lastDebit ? formatDate(row.original.lastDebit) : '—' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function StandingOrderListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'standing' | 'direct-debit'>('standing');
  const [showNew, setShowNew] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['standing-orders'],
    queryFn: () => standingOrderApi.getAll(),
  });

  const { data: mandates = [], isLoading: mandatesLoading } = useQuery({
    queryKey: ['direct-debits'],
    queryFn: () => standingOrderApi.getDirectDebits(),
  });

  if (showNew) {
    return (
      <>
        <PageHeader title="New Standing Order" />
        <div className="page-container">
          <NewStandingOrderForm onSuccess={() => setShowNew(false)} onCancel={() => setShowNew(false)} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Standing Orders & Direct Debits"
        subtitle="Manage recurring payment instructions"
        actions={
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Standing Order
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="flex gap-1 border-b">
          {[{ key: 'standing' as const, label: 'Standing Orders' }, { key: 'direct-debit' as const, label: 'Direct Debits' }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'standing' ? (
          <StandingOrderTable
            data={orders}
            isLoading={ordersLoading}
            onRowClick={(row) => navigate(`/payments/standing-orders/${row.id}`)}
          />
        ) : (
          <DataTable columns={ddColumns} data={mandates} isLoading={mandatesLoading} enableGlobalFilter emptyMessage="No direct debit mandates" />
        )}
      </div>
    </>
  );
}
