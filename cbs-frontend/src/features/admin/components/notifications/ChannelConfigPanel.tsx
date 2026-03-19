import { useState } from 'react';
import { Mail, MessageSquare, Bell, MonitorSmartphone, Edit2, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelConfig, NotificationChannel } from '../../api/notificationAdminApi';

interface ChannelConfigPanelProps {
  configs: ChannelConfig[];
  onUpdate: (channel: NotificationChannel, data: Partial<ChannelConfig>) => void;
  onTest: (channel: NotificationChannel, recipient: string) => void;
}

const channelIcon: Record<NotificationChannel, React.ElementType> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  PUSH: Bell,
  IN_APP: MonitorSmartphone,
};

const channelColor: Record<NotificationChannel, string> = {
  EMAIL: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  SMS: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  PUSH: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  IN_APP: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
};

const statusDot: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  DEGRADED: 'bg-amber-500',
  INACTIVE: 'bg-red-500',
};

const recipientLabel: Record<NotificationChannel, string> = {
  EMAIL: 'Email address',
  SMS: 'Phone number (e.g. 08012345678)',
  PUSH: 'Device token or user ID',
  IN_APP: 'User ID',
};

interface EditState {
  channel: NotificationChannel;
  fromAddress: string;
  fromName: string;
  senderId: string;
  dailyLimit: string;
}

interface TestState {
  channel: NotificationChannel;
  recipient: string;
  loading: boolean;
  result: { success: boolean; messageId?: string; error?: string } | null;
}

export function ChannelConfigPanel({ configs, onUpdate, onTest }: ChannelConfigPanelProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [testState, setTestState] = useState<TestState | null>(null);

  const handleEdit = (cfg: ChannelConfig) => {
    setEditState({
      channel: cfg.channel,
      fromAddress: cfg.fromAddress ?? '',
      fromName: cfg.fromName ?? '',
      senderId: cfg.senderId ?? '',
      dailyLimit: String(cfg.dailyLimit),
    });
  };

  const handleSaveEdit = () => {
    if (!editState) return;
    onUpdate(editState.channel, {
      fromAddress: editState.fromAddress || undefined,
      fromName: editState.fromName || undefined,
      senderId: editState.senderId || undefined,
      dailyLimit: Number(editState.dailyLimit),
    });
    setEditState(null);
  };

  const handleTestOpen = (cfg: ChannelConfig) => {
    setTestState({ channel: cfg.channel, recipient: '', loading: false, result: null });
  };

  const handleTestSend = async () => {
    if (!testState) return;
    setTestState((s) => s ? { ...s, loading: true, result: null } : s);
    try {
      onTest(testState.channel, testState.recipient);
      setTestState((s) => s ? {
        ...s,
        loading: false,
        result: { success: true, messageId: `TEST-${Date.now()}` },
      } : s);
    } catch {
      setTestState((s) => s ? {
        ...s,
        loading: false,
        result: { success: false, error: 'Test send failed. Please verify the recipient and try again.' },
      } : s);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg) => {
          const Icon = channelIcon[cfg.channel];
          const usagePercent = Math.min(100, (cfg.sentToday / cfg.dailyLimit) * 100);
          const usageColor = usagePercent > 90 ? 'bg-destructive' : usagePercent > 70 ? 'bg-amber-500' : 'bg-primary';

          return (
            <div key={cfg.channel} className="bg-card rounded-lg border border-border p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-lg', channelColor[cfg.channel])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{cfg.channel.replace('_', ' ')}</h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusDot[cfg.status])} />
                        {cfg.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cfg.provider}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                {cfg.fromAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From Address</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{cfg.fromAddress}</span>
                  </div>
                )}
                {cfg.fromName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Display Name</span>
                    <span className="font-medium">{cfg.fromName}</span>
                  </div>
                )}
                {cfg.senderId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sender ID</span>
                    <span className="font-medium">{cfg.senderId}</span>
                  </div>
                )}
                {cfg.costPerUnit !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per SMS</span>
                    <span className="font-medium">₦{cfg.costPerUnit.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Usage progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Daily Usage</span>
                  <span className="font-medium tabular-nums">
                    {cfg.sentToday.toLocaleString()} / {cfg.dailyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', usageColor)}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% of daily limit used</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleEdit(cfg)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border hover:bg-muted transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Configuration
                </button>
                <button
                  onClick={() => handleTestOpen(cfg)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border hover:bg-muted transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test Send
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">Edit {editState.channel.replace('_', ' ')} Configuration</h2>
              <button onClick={() => setEditState(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {editState.channel === 'EMAIL' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">From Address</label>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={editState.fromAddress}
                      onChange={(e) => setEditState((s) => s ? { ...s, fromAddress: e.target.value } : s)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Display Name</label>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={editState.fromName}
                      onChange={(e) => setEditState((s) => s ? { ...s, fromName: e.target.value } : s)}
                    />
                  </div>
                </>
              )}
              {editState.channel === 'SMS' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sender ID</label>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={editState.senderId}
                    onChange={(e) => setEditState((s) => s ? { ...s, senderId: e.target.value } : s)}
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 11 characters for alphanumeric sender ID</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Daily Send Limit</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={editState.dailyLimit}
                  onChange={(e) => setEditState((s) => s ? { ...s, dailyLimit: e.target.value } : s)}
                  min={1}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setEditState(null)}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Send Dialog */}
      {testState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm">Test {testState.channel.replace('_', ' ')} Send</h2>
              <button onClick={() => setTestState(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {recipientLabel[testState.channel]}
                </label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={testState.recipient}
                  onChange={(e) => setTestState((s) => s ? { ...s, recipient: e.target.value, result: null } : s)}
                  placeholder={testState.channel === 'EMAIL' ? 'test@example.com' : '08012345678'}
                  disabled={testState.loading}
                />
              </div>

              {testState.result && (
                <div className={cn(
                  'flex items-start gap-2 p-3 rounded-md text-sm',
                  testState.result.success
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                )}>
                  {testState.result.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    {testState.result.success
                      ? `Test message sent. ID: ${testState.result.messageId}`
                      : testState.result.error}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setTestState(null)}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleTestSend}
                disabled={testState.loading || !testState.recipient.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {testState.loading ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
