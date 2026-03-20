import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { channelIcon } from './ChannelSelector';
import { MessageDetailDrawer } from './MessageDetailDrawer';
import { useFailedNotifications, useRetryFailed } from '../hooks/useCommunications';
import type { NotificationLog } from '../api/communicationApi';

export function FailedMessagePanel() {
  const {
    data: failures = [],
    isLoading,
    isError,
  } = useFailedNotifications();
  const retryAll = useRetryFailed();
  const [selected, setSelected] = useState<NotificationLog | null>(null);

  const handleRetryAll = () => {
    retryAll.mutate(undefined, {
      onSuccess: (data) => toast.success(`Retried ${data.retried} failed notifications`),
      onError: () => toast.error('Failed to retry notifications'),
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Failed notifications could not be loaded from the backend.
      </div>
    );
  }

  if (failures.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No failed messages</p>
        <p className="text-xs mt-1">All messages have been delivered successfully.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-red-600">{failures.length} failed message{failures.length !== 1 ? 's' : ''}</p>
          <button onClick={handleRetryAll} disabled={retryAll.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
            {retryAll.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Retry All Failed
          </button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Recipient</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Error</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Retries</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Last Attempt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {failures.map((msg) => {
                const Icon = channelIcon(msg.channel);
                return (
                  <tr key={msg.id} onClick={() => setSelected(msg)} className="hover:bg-muted/30 cursor-pointer">
                    <td className="px-4 py-2.5"><Icon className="w-4 h-4 text-muted-foreground" /></td>
                    <td className="px-4 py-2.5 text-sm">{msg.recipientAddress ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-red-600 max-w-[200px] truncate">{msg.failureReason ?? 'Unknown'}</td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">{msg.retryCount}/{msg.maxRetries}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelative(msg.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MessageDetailDrawer message={selected} onClose={() => setSelected(null)} />
    </>
  );
}
