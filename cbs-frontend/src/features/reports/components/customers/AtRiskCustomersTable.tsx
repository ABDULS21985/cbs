import { useMemo } from 'react';
import { toast } from 'sonner';
import { PhoneCall } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AtRiskCustomer } from '../../api/customerAnalyticsApi';

interface AtRiskCustomersTableProps {
  data: AtRiskCustomer[];
  isLoading: boolean;
}

function ChurnScoreBar({ score }: { score: number }) {
  const color =
    score > 70 ? 'bg-red-500' :
    score >= 40 ? 'bg-amber-500' :
    'bg-green-500';
  const textColor =
    score > 70 ? 'text-red-600' :
    score >= 40 ? 'text-amber-600' :
    'text-green-600';
  return (
    <div className="flex items-center gap-2 min-w-[96px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums w-7 text-right', textColor)}>
        {score}
      </span>
    </div>
  );
}

function ContactButton({ customer }: { customer: AtRiskCustomer }) {
  const handleContact = () => {
    toast.success(`Contact initiated for ${customer.name}`, {
      description: `Segment: ${customer.segment} · Churn Score: ${customer.churnScore}`,
    });
  };
  return (
    <button
      onClick={handleContact}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
    >
      <PhoneCall className="w-3 h-3" />
      Contact
    </button>
  );
}

function buildColumns(): ColumnDef<AtRiskCustomer, any>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Customer Name',
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-semibold">{row.original.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.original.id}</p>
        </div>
      ),
    },
    {
      accessorKey: 'segment',
      header: 'Segment',
      cell: ({ getValue }) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'churnScore',
      header: 'Churn Score',
      cell: ({ getValue }) => <ChurnScoreBar score={getValue<number>()} />,
      sortingFn: 'basic',
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ getValue }) => (
        <span className="text-xs tabular-nums">{formatMoney(getValue<number>())}</span>
      ),
      sortingFn: 'basic',
    },
    {
      accessorKey: 'revenueAtRisk',
      header: 'Revenue at Risk',
      cell: ({ getValue }) => (
        <span className="text-xs font-semibold tabular-nums text-red-600">{formatMoney(getValue<number>())}</span>
      ),
      sortingFn: 'basic',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => <ContactButton customer={row.original} />,
    },
  ];
}

export function AtRiskCustomersTable({ data, isLoading }: AtRiskCustomersTableProps) {
  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">At-Risk Customers</h2>
        <span className="text-xs text-muted-foreground">
          {data.length} customers flagged
        </span>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableGlobalFilter
        pageSize={10}
        emptyMessage="No at-risk customers found"
      />
    </div>
  );
}
