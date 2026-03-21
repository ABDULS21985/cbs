import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { notificationApi, type NotificationPreference } from '../api/communicationApi';

interface Props {
  customerId: number;
}

const CATEGORIES = [
  { key: 'ACCOUNT_ALERTS', label: 'Account Alerts', mandatory: false },
  { key: 'TRANSACTION_ALERTS', label: 'Transaction Alerts', mandatory: false },
  { key: 'SECURITY', label: 'Security Alerts', mandatory: true },
  { key: 'MARKETING', label: 'Marketing', mandatory: false },
  { key: 'PRODUCT_UPDATES', label: 'Product Updates', mandatory: false },
  { key: 'SURVEYS', label: 'Surveys', mandatory: false },
  { key: 'REGULATORY', label: 'Regulatory', mandatory: true },
];

const CHANNELS = [
  { key: 'EMAIL', label: 'Email', icon: '✉' },
  { key: 'SMS', label: 'SMS', icon: '📱' },
  { key: 'PUSH', label: 'Push', icon: '🔔' },
  { key: 'IN_APP', label: 'In-App', icon: '📋' },
];

export function OptInOutManager({ customerId }: Props) {
  const queryClient = useQueryClient();
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const undoRef = useRef<{ channel: string; eventType: string; wasEnabled: boolean } | null>(null);

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences', customerId],
    queryFn: () => notificationApi.getCustomerPreferences(customerId),
    enabled: customerId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ channel, eventType, enabled }: { channel: string; eventType: string; enabled: boolean }) =>
      notificationApi.updateNotificationPreference(customerId, channel, eventType, enabled),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', customerId] });
      // Flash indicator
      setFlashKey(`${vars.channel}-${vars.eventType}`);
      setTimeout(() => setFlashKey(null), 1500);
      // Undo toast
      undoRef.current = { channel: vars.channel, eventType: vars.eventType, wasEnabled: !vars.enabled };
      toast.success('Preference updated', {
        action: {
          label: 'Undo',
          onClick: () => {
            if (undoRef.current) {
              updateMutation.mutate({ channel: undoRef.current.channel, eventType: undoRef.current.eventType, enabled: undoRef.current.wasEnabled });
            }
          },
        },
        duration: 5000,
      });
    },
    onError: () => toast.error('Failed to update preference'),
  });

  const isEnabled = useCallback((channel: string, eventType: string) => {
    const pref = preferences.find((p: NotificationPreference) => p.channel === channel && p.eventType === eventType);
    return pref ? pref.isEnabled : true; // default to enabled
  }, [preferences]);

  const handleToggle = (channel: string, eventType: string) => {
    updateMutation.mutate({ channel, eventType, enabled: !isEnabled(channel, eventType) });
  };

  if (isLoading) {
    return <div className="rounded-lg border bg-card p-6"><div className="h-48 bg-muted/30 animate-pulse rounded-lg" /></div>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">Communication Preferences</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Manage notification opt-in/out per category and channel</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-48">Category</th>
              {CHANNELS.map(ch => (
                <th key={ch.key} className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                  <span className="mr-1">{ch.icon}</span>{ch.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat.key} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 text-sm font-medium flex items-center gap-2">
                  {cat.label}
                  {cat.mandatory && <Lock className="w-3 h-3 text-muted-foreground" aria-label="Cannot disable — mandatory" />}
                </td>
                {CHANNELS.map(ch => {
                  const key = `${ch.key}-${cat.key}`;
                  const enabled = cat.mandatory ? true : isEnabled(ch.key, cat.key);
                  const isFlashing = flashKey === key;
                  return (
                    <td key={ch.key} className="px-4 py-3 text-center">
                      <button
                        onClick={() => !cat.mandatory && handleToggle(ch.key, cat.key)}
                        disabled={cat.mandatory || updateMutation.isPending}
                        className={cn(
                          'w-11 h-6 rounded-full transition-all relative inline-flex items-center',
                          enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                          cat.mandatory && 'opacity-60 cursor-not-allowed',
                          isFlashing && 'ring-2 ring-amber-400 ring-offset-1',
                        )}
                      >
                        <span className={cn(
                          'absolute w-5 h-5 rounded-full bg-white shadow transition-transform',
                          enabled ? 'translate-x-5' : 'translate-x-0.5',
                        )} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
