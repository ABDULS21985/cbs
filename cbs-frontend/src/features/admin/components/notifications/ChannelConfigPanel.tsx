import { useState } from 'react';
import { Mail, MessageSquare, Bell, MonitorSmartphone, Send, X, CheckCircle, AlertCircle, Loader2, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelConfig, NotificationChannel } from '../../api/notificationAdminApi';

interface ChannelConfigPanelProps {
  configs: ChannelConfig[];
  onUpdate: (channel: NotificationChannel, data: Partial<ChannelConfig>) => Promise<void>;
  onTest: (channel: NotificationChannel, recipient: string) => Promise<void>;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail, SMS: MessageSquare, PUSH: Bell, IN_APP: MonitorSmartphone,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
};

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  EMAIL: 'Transactional and marketing emails via SMTP/API provider',
  SMS: 'SMS alerts via mobile messaging gateway',
  PUSH: 'Browser and mobile push notifications',
  IN_APP: 'In-application notification center messages',
};

export function ChannelConfigPanel({ configs, onUpdate, onTest }: ChannelConfigPanelProps) {
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; timestamp: string }>>({});
  const [showTestDialog, setShowTestDialog] = useState<string | null>(null);
  const [togglingChannel, setTogglingChannel] = useState<string | null>(null);

  const handleTest = async (channel: NotificationChannel) => {
    setTestingChannel(channel);
    try {
      await onTest(channel, testRecipient);
      setTestResults(prev => ({ ...prev, [channel]: { success: true, timestamp: new Date().toLocaleTimeString() } }));
    } catch {
      setTestResults(prev => ({ ...prev, [channel]: { success: false, timestamp: new Date().toLocaleTimeString() } }));
    } finally {
      setTestingChannel(null);
      setShowTestDialog(null);
    }
  };

  const handleToggle = async (config: ChannelConfig) => {
    setTogglingChannel(config.channel);
    try {
      await onUpdate(config.channel, { enabled: !config.enabled });
    } finally {
      setTogglingChannel(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map(config => {
          const Icon = CHANNEL_ICONS[config.channel] || Mail;
          const lastTest = testResults[config.channel];
          const isToggling = togglingChannel === config.channel;

          return (
            <div key={config.channel} className="rounded-xl border bg-card overflow-hidden">
              {/* Header */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-lg', CHANNEL_COLORS[config.channel])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{config.channel}</h3>
                      <p className="text-xs text-muted-foreground">Provider: {config.provider}</p>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(config)}
                    disabled={isToggling}
                    className={cn(
                      'relative inline-flex w-10 h-5 rounded-full transition-colors',
                      config.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
                      isToggling && 'opacity-50',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      config.enabled && 'translate-x-5',
                    )} />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  {CHANNEL_DESCRIPTIONS[config.channel] || 'Notification delivery channel'}
                </p>

                {/* Health indicator */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    {config.enabled ? (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                    )}
                    <span className={cn('text-xs font-medium', config.enabled ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
                      {config.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {lastTest && (
                    <div className="flex items-center gap-1.5">
                      {lastTest.success ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Last test: {lastTest.timestamp}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t">
                <button
                  onClick={() => { setShowTestDialog(config.channel); setTestRecipient(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium hover:bg-muted transition-colors border-r"
                >
                  <Zap className="w-3.5 h-3.5" /> Test Connection
                </button>
                <button
                  onClick={() => handleToggle(config)}
                  disabled={isToggling}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  {config.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTestDialog(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Test {showTestDialog} Delivery</h3>
              <button onClick={() => setShowTestDialog(null)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send a test message to verify the {showTestDialog} channel is properly configured.
            </p>
            <input
              value={testRecipient}
              onChange={e => setTestRecipient(e.target.value)}
              placeholder={showTestDialog === 'EMAIL' ? 'test@example.com' : showTestDialog === 'SMS' ? '+234...' : 'device-token'}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => handleTest(showTestDialog as NotificationChannel)}
              disabled={!testRecipient || testingChannel !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {testingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
