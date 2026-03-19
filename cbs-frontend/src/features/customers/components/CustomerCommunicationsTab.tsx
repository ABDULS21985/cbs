import { Mail, MessageSquare, Bell, Smartphone, Send } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import { StatusBadge, EmptyState } from '@/components/shared';
import { useCustomerCommunications } from '../hooks/useCustomers';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  PUSH: <Bell className="h-4 w-4" />,
  IN_APP: <Smartphone className="h-4 w-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

export function CustomerCommunicationsTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data: comms, isLoading } = useCustomerCommunications(customerId, active);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Send className="h-4 w-4" /> Send New Message
        </button>
      </div>
      {!comms?.length ? (
        <EmptyState
          icon={Mail}
          title="No communications"
          description="No messages have been sent to this customer yet"
        />
      ) : (
        <div className="space-y-2">
          {comms.map(comm => (
            <div
              key={comm.id}
              className="flex items-start gap-3 border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className={`p-1.5 rounded-md shrink-0 ${CHANNEL_COLORS[comm.channel] ?? 'bg-gray-100 text-gray-600'}`}>
                {CHANNEL_ICONS[comm.channel]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{comm.subject}</span>
                  <StatusBadge status={comm.status} size="sm" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {comm.channel} · {formatDateTime(comm.sentAt)}
                  {comm.template && ` · ${comm.template}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
