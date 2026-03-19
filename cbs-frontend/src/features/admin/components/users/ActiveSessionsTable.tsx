import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { LogOut, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, ConfirmDialog } from '@/components/shared';
import { userAdminApi, type ActiveSession } from '../../api/userAdminApi';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { differenceInMinutes, parseISO } from 'date-fns';

function useLiveDuration(loginTime: string): string {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const start = parseISO(loginTime);
  const totalMins = differenceInMinutes(now, start);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function DurationCell({ loginTime }: { loginTime: string }) {
  const duration = useLiveDuration(loginTime);
  return <span className="text-sm tabular-nums">{duration}</span>;
}

export function ActiveSessionsTable() {
  const [confirmLogout, setConfirmLogout] = useState<ActiveSession | null>(null);
  const qc = useQueryClient();

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => userAdminApi.getActiveSessions(),
    refetchInterval: 30000,
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (sessionId: string) => userAdminApi.forceLogoutSession(sessionId),
    onSuccess: () => {
      toast.success('Session terminated');
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setConfirmLogout(null);
    },
    onError: () => toast.error('Failed to terminate session'),
  });

  const totalSessions = sessions.length;
  const multipleSessions = sessions.filter(s => s.isMultiple).length;

  const columns: ColumnDef<ActiveSession>[] = [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium flex items-center gap-2">
            {row.original.fullName}
            {row.original.isMultiple && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                Multiple sessions
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: 'ip',
      header: 'IP Address',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.ip}</span>,
    },
    {
      accessorKey: 'loginTime',
      header: 'Login Time',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.loginTime)}</span>,
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => <DurationCell loginTime={row.original.loginTime} />,
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      cell: ({ row }) => {
        const mins = differenceInMinutes(new Date(), parseISO(row.original.lastActivity));
        return (
          <span className={cn('text-sm', mins > 30 ? 'text-amber-600' : 'text-muted-foreground')}>
            {mins < 1 ? 'Just now' : `${mins}m ago`}
          </span>
        );
      },
    },
    {
      accessorKey: 'browser',
      header: 'Browser',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.browser}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmLogout(row.original); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Force Logout
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span><strong>{totalSessions}</strong> active session{totalSessions !== 1 ? 's' : ''}</span>
          </div>
          {multipleSessions > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium">
              {multipleSessions} users with multiple sessions
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No active sessions"
      />

      <ConfirmDialog
        open={!!confirmLogout}
        onClose={() => setConfirmLogout(null)}
        onConfirm={() => forceLogoutMutation.mutate(confirmLogout!.id)}
        title="Force Logout Session"
        description={`Terminate the session for ${confirmLogout?.fullName} (${confirmLogout?.ip})? They will be immediately logged out.`}
        confirmLabel="Force Logout"
        variant="destructive"
        isLoading={forceLogoutMutation.isPending}
      />
    </div>
  );
}
