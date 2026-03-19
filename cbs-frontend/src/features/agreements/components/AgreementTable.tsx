import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import type { Agreement } from '../api/agreementApi';

const columns: ColumnDef<Agreement, any>[] = [
  { accessorKey: 'agreementCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.agreementCode}</span> },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'agreementType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.agreementType.replace(/_/g, ' ')}</span> },
  { accessorKey: 'productName', header: 'Product', cell: ({ row }) => row.original.productName || '—' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'signedAt', header: 'Signed', cell: ({ row }) => row.original.signedAt ? formatDate(row.original.signedAt) : '—' },
  { accessorKey: 'expiryDate', header: 'Expires', cell: ({ row }) => row.original.expiryDate ? formatDate(row.original.expiryDate) : '—' },
  { accessorKey: 'version', header: 'Ver.', cell: ({ row }) => <span className="font-mono text-xs">v{row.original.version}</span> },
];

interface Props {
  data: Agreement[];
  isLoading?: boolean;
  onRowClick?: (row: Agreement) => void;
}

export function AgreementTable({ data, isLoading, onRowClick }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableGlobalFilter
      enableExport
      exportFilename="agreements"
      emptyMessage="No agreements found"
    />
  );
}
