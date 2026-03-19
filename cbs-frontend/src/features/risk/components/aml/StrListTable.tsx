import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { StrReport } from '../../types/aml';

interface Props {
  data: StrReport[];
  isLoading?: boolean;
}

type StrStatus = StrReport['status'];

const STR_PIPELINE: StrStatus[] = ['DRAFT', 'REVIEWED', 'APPROVED', 'FILED_WITH_NFIU', 'ACKNOWLEDGED'];

const statusColor = (status: StrStatus) => {
  if (status === 'ACKNOWLEDGED') return 'bg-green-50 text-green-700';
  if (status === 'FILED_WITH_NFIU') return 'bg-blue-50 text-blue-700';
  if (status === 'APPROVED') return 'bg-teal-50 text-teal-700';
  if (status === 'REVIEWED') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
};

function PipelineBadge({ status }: { status: StrStatus }) {
  const currentIdx = STR_PIPELINE.indexOf(status);
  return (
    <div className="flex items-center gap-0.5">
      {STR_PIPELINE.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                done ? 'bg-green-500' : active ? 'bg-primary' : 'bg-gray-200',
              )}
              title={step.replace(/_/g, ' ')}
            />
            {idx < STR_PIPELINE.length - 1 && (
              <div className={cn('w-3 h-px', done ? 'bg-green-500' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
      <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium', statusColor(status))}>
        {status.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

const columns: ColumnDef<StrReport>[] = [
  {
    accessorKey: 'strNumber',
    header: 'STR #',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'filingDate',
    header: 'Filing Date',
    cell: ({ getValue }) => (
      <span className="text-sm">{formatDate(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <PipelineBadge status={getValue<StrStatus>()} />,
  },
  {
    accessorKey: 'nfiuReference',
    header: 'NFIU Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue<string | undefined>() ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'filingOfficer',
    header: 'Officer',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
  },
];

export function StrListTable({ data, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="No STRs filed"
      pageSize={10}
      enableExport
      exportFilename="str-reports"
      enableGlobalFilter
    />
  );
}
