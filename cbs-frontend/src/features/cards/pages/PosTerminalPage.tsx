import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable } from '@/components/shared';
import { Plus, Monitor, Wifi, WifiOff, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/formatters';
import { usePosTerminals } from '../hooks/useCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { PosTerminal } from '../types/card';
import { cn } from '@/lib/utils';

const statusIcons: Record<string, { icon: typeof Wifi; color: string }> = {
  ONLINE: { icon: Wifi, color: 'text-green-500' },
  IDLE: { icon: Clock, color: 'text-amber-500' },
  OFFLINE: { icon: WifiOff, color: 'text-red-500' },
};

const columns: ColumnDef<PosTerminal, any>[] = [
  { accessorKey: 'terminalId', header: 'Terminal ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.terminalId}</span> },
  { accessorKey: 'merchantName', header: 'Merchant' },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'model', header: 'Model' },
  { accessorKey: 'lastTransaction', header: 'Last Txn', cell: ({ row }) => <span className="text-xs">{formatRelative(row.original.lastTransaction)}</span> },
  { accessorKey: 'onlineStatus', header: 'Status', cell: ({ row }) => {
    const { icon: Icon, color } = statusIcons[row.original.onlineStatus];
    return <span className={cn('flex items-center gap-1.5 text-xs font-medium', color)}><Icon className="w-3.5 h-3.5" /> {row.original.onlineStatus}</span>;
  }},
  { accessorKey: 'deployedDate', header: 'Deployed', cell: ({ row }) => formatDate(row.original.deployedDate) },
];

export function PosTerminalPage() {
  useEffect(() => { document.title = 'POS Terminals | CBS'; }, []);
  const { data: terminals = [], isLoading, isError, refetch } = usePosTerminals();

  const online = terminals.filter((t) => t.onlineStatus === 'ONLINE').length;
  const idle = terminals.filter((t) => t.onlineStatus === 'IDLE').length;
  const offline = terminals.filter((t) => t.onlineStatus === 'OFFLINE').length;

  return (
    <>
      <PageHeader title="POS Terminals" actions={
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Deploy Terminal
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Terminals" value={terminals.length} format="number" icon={Monitor} />
          <StatCard label="Online" value={online} format="number" icon={Wifi} />
          <StatCard label="Idle" value={idle} format="number" icon={Clock} />
          <StatCard label="Offline" value={offline} format="number" icon={WifiOff} />
        </div>
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm">Failed to load terminals.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading terminals…
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Monitor className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No terminals found.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={terminals} enableGlobalFilter enableExport exportFilename="pos-terminals" />
        )}
      </div>
    </>
  );
}
