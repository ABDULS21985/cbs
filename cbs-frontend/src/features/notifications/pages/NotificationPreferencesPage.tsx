import { useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Send, Loader2 } from 'lucide-react';
import type { NotificationChannel } from '../types/notificationExt';
import { useNotificationPreferences, useUpdatePreference, useSendNotification } from '../hooks/useNotificationsExt';
import { ChannelToggleCard } from '../components/ChannelToggleCard';
import { PreferenceMatrix } from '../components/PreferenceMatrix';
import { QuietHoursConfig } from '../components/QuietHoursConfig';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

const CHANNELS: { channel: NotificationChannel; description: string }[] = [
  { channel: 'EMAIL', description: 'Receive notifications via email' },
  { channel: 'SMS', description: 'Receive SMS alerts to your phone' },
  { channel: 'PUSH', description: 'Browser push notifications' },
  { channel: 'IN_APP', description: 'In-application notification center' },
  { channel: 'WEBHOOK', description: 'HTTP callback to external systems' },
];

export function NotificationPreferencesPage() {
  const user = useAuthStore((state) => state.user);
  const currentCustomerId = useMemo(() => {
    const candidates = [user?.id, user?.username].filter(Boolean) as string[];
    for (const candidate of candidates) {
      if (/^\d+$/.test(candidate)) {
        const numericId = Number(candidate);
        if (numericId > 0) {
          return numericId;
        }
      }
    }
    return null;
  }, [user]);
  const { data: preferences = [], isLoading } = useNotificationPreferences(currentCustomerId ?? 0);
  const updatePref = useUpdatePreference();
  const sendTest = useSendNotification();
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});
  const [testChannel, setTestChannel] = useState<NotificationChannel>('EMAIL');

  const isChannelEnabled = (channel: NotificationChannel): boolean => {
    const channelPrefs = preferences.filter((p) => p.channel === channel);
    if (channelPrefs.length === 0) return true;
    return channelPrefs.some((p) => p.isEnabled);
  };

  const handleToggle = useCallback((channel: NotificationChannel, eventType: string, enabled: boolean) => {
    if (!currentCustomerId) {
      toast.error('Authenticated user is not mapped to a numeric customer profile.');
      return;
    }
    const key = `${channel}:${eventType}`;
    setUpdatingKeys((prev) => ({ ...prev, [key]: true }));
    updatePref.mutate(
      { customerId: currentCustomerId, channel, eventType, enabled },
      {
        onSettled: () => setUpdatingKeys((prev) => { const next = { ...prev }; delete next[key]; return next; }),
      },
    );
  }, [currentCustomerId, updatePref]);

  const handleChannelMasterToggle = useCallback((channel: NotificationChannel, enabled: boolean) => {
    // Toggle all event types for this channel
    const eventTypes = [
      'TRANSACTION_CREDIT', 'TRANSACTION_DEBIT', 'TRANSACTION_TRANSFER', 'TRANSACTION_FAILED',
      'ACCOUNT_OPENED', 'ACCOUNT_CLOSED', 'BALANCE_ALERT', 'STATEMENT_READY',
      'LOAN_DISBURSED', 'LOAN_REPAYMENT_DUE', 'LOAN_OVERDUE', 'LOAN_SETTLED',
      'CARD_TRANSACTION', 'CARD_BLOCKED', 'CARD_EXPIRING',
      'LOGIN', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'SUSPICIOUS_ACTIVITY',
      'MAINTENANCE', 'SYSTEM_UPDATE', 'CUSTOM_NOTIFICATION',
    ];
    eventTypes.forEach((eventType) => {
      handleToggle(channel, eventType, enabled);
    });
    toast.success(`${channel} notifications ${enabled ? 'enabled' : 'disabled'}`);
  }, [handleToggle]);

  const handleSendTest = () => {
    if (!currentCustomerId) {
      toast.error('Authenticated user is not mapped to a numeric customer profile.');
      return;
    }
    sendTest.mutate(
      { eventType: 'TEST_NOTIFICATION', customerId: currentCustomerId },
      {
        onSuccess: () => toast.success(`Test ${testChannel} notification sent`),
        onError: () => toast.error('Failed to send test notification'),
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Notification Settings" backTo="/notifications" />
        <div className="page-container space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </>
    );
  }

  if (!currentCustomerId) {
    return (
      <>
        <PageHeader
          title="Notification Settings"
          subtitle="Manage how and when you receive notifications"
          backTo="/notifications"
        />
        <div className="page-container">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            The authenticated session is not mapped to a numeric customer ID, so customer notification preferences cannot be loaded or changed from this page.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notification Settings"
        subtitle="Manage how and when you receive notifications"
        backTo="/notifications"
      />
      <div className="page-container space-y-8">
        {/* Section 1: Channel Overview */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Notification Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CHANNELS.map(({ channel, description }) => (
              <ChannelToggleCard
                key={channel}
                channel={channel}
                description={description}
                enabled={isChannelEnabled(channel)}
                onToggle={(enabled) => handleChannelMasterToggle(channel, enabled)}
              />
            ))}
          </div>
        </div>

        {/* Section 2: Event Preferences Matrix */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Event Preferences</h2>
          <p className="text-xs text-muted-foreground mb-4">Choose which events trigger notifications on each channel</p>
          <PreferenceMatrix
            preferences={preferences}
            onToggle={handleToggle}
            isUpdating={updatingKeys}
          />
        </div>

        {/* Section 3: Quiet Hours */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Quiet Hours</h2>
          <QuietHoursConfig />
        </div>

        {/* Section 4: Test Notification */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Test Notification</h2>
          <p className="text-xs text-muted-foreground mb-4">Send a test notification to verify your settings</p>
          <div className="flex items-center gap-3">
            <select
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value as NotificationChannel)}
              className="h-9 px-3 text-sm rounded-lg border bg-background"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="PUSH">Push</option>
              <option value="IN_APP">In-App</option>
              <option value="WEBHOOK">Webhook</option>
            </select>
            <button
              onClick={handleSendTest}
              disabled={sendTest.isPending}
              className="flex items-center gap-2 btn-primary"
            >
              {sendTest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendTest.isPending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
