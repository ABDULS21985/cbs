import type React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { ChannelBadge } from './ChannelBadge';
import type { NotificationTemplate } from '../../../admin/api/notificationAdminApi';

interface TemplateTableProps {
  templates: NotificationTemplate[];
  isLoading: boolean;
  onRowClick: (template: NotificationTemplate) => void;
  renderActions?: (template: NotificationTemplate) => React.ReactNode;
}

const columns: ColumnDef<NotificationTemplate, unknown>[] = [
  { accessorKey: 'templateCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.templateCode}</span> },
  { accessorKey: 'templateName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.templateName}</span> },
  { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <ChannelBadge channel={row.original.channel} size="sm" /> },
  { accessorKey: 'eventType', header: 'Event Type', cell: ({ row }) => <span className="text-xs">{row.original.eventType}</span> },
  { accessorKey: 'subject', header: 'Subject', cell: ({ row }) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{row.original.subject || '—'}</span> },
  {
    accessorKey: 'isActive', header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'ARCHIVED'} />,
  },
  { accessorKey: 'version', header: 'Ver.', cell: ({ row }) => <span className="font-mono text-xs">v{row.original.version}</span> },
  { accessorKey: 'updatedAt', header: 'Updated', cell: ({ row }) => <span className="text-xs">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '—'}</span> },
];

export function TemplateTable({ templates, isLoading, onRowClick, renderActions }: TemplateTableProps) {
  const allCols = renderActions
    ? [...columns, {
        id: 'actions', header: '', cell: ({ row }: { row: { original: NotificationTemplate } }) => (
          <div onClick={(e) => e.stopPropagation()}>{renderActions(row.original)}</div>
        ),
      } as ColumnDef<NotificationTemplate, unknown>]
    : columns;

  return (
    <DataTable
      columns={allCols}
      data={templates}
      isLoading={isLoading}
      enableGlobalFilter
      enableExport
      exportFilename="notification-templates"
      onRowClick={onRowClick}
      emptyMessage="No templates found"
    />
  );
}
