import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import type { AuditEntry } from '../../api/auditApi';

const actionColors: Record<string, string> = {
  CREATE: 'text-green-600', UPDATE: 'text-blue-600', DELETE: 'text-red-600',
  APPROVE: 'text-green-600', REJECT: 'text-red-600', LOGIN: 'text-gray-500',
  LOGOUT: 'text-gray-500', VIEW: 'text-gray-400', EXPORT: 'text-amber-600',
};

const columns: ColumnDef<AuditEntry, any>[] = [
  { accessorKey: 'timestamp', header: 'Timestamp', cell: ({ row }) => <span className="font-mono text-[11px]">{new Date(row.original.timestamp).toISOString().replace('T', ' ').slice(0, 23)}</span> },
  { accessorKey: 'userName', header: 'User', cell: ({ row }) => (<div><span className="text-sm">{row.original.userName}</span><br /><span className="text-xs text-muted-foreground">{row.original.userRole}</span></div>) },
  { accessorKey: 'action', header: 'Action', cell: ({ row }) => <span className={`text-xs font-semibold ${actionColors[row.original.action] || ''}`}>{row.original.action}</span> },
  { accessorKey: 'entityType', header: 'Entity', cell: ({ row }) => <span className="text-xs">{row.original.entityType}</span> },
  { accessorKey: 'entityId', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.entityId}</span> },
  { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-xs truncate max-w-[250px] block">{row.original.description}</span> },
  { accessorKey: 'ipAddress', header: 'IP', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.ipAddress}</span> },
  { accessorKey: 'sessionId', header: 'Session', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.sessionId.slice(0, 12)}</span> },
];

interface Props { data: AuditEntry[]; isLoading?: boolean; onRowClick?: (row: AuditEntry) => void }

export function AuditResultsTable({ data, isLoading, onRowClick }: Props) {
  return <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={onRowClick} enableGlobalFilter enableExport exportFilename="audit-trail" pageSize={25} />;
}
