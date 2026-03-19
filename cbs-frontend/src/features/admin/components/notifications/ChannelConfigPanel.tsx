import { useState } from 'react';
import { Mail, MessageSquare, Bell, MonitorSmartphone, Send, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

export function ChannelConfigPanel({ configs, onUpdate, onTest }: ChannelConfigPanelProps) {
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean } | null>(null);
  const [showTestDialog, setShowTestDialog] = useState<string | null>(null);

  const handleTest = async (channel: NotificationChannel) => {
    setTestingChannel(channel);
    try {
      await onTest(channel, testRecipient);
      setTestResult({ channel, success: true });
    } catch {
      setTestResult({ channel, success: false });
    } finally {
      setTestingChannel(null);
      setShowTestDialog(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {testResult && (
        <div className={cn('flex items-center gap-2 rounded-lg border px-4 py-3',
          testResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40')}>
          {testResult.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span className={cn('text-sm', testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
            {testResult.success ? `Test ${testResult.channel} sent successfully` : `Test ${testResult.channel} failed`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map(config => {
          const Icon = CHANNEL_ICONS[config.channel] || Mail;
          return (
            <div key={config.channel} className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', CHANNEL_COLORS[config.channel])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{config.channel}</h3>
                    <p className="text-xs text-muted-foreground">Provider: {config.provider}</p>
                  </div>
                </div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  config.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600')}>
                  {config.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => onUpdate(config.channel, { enabled: !config.enabled })}
                  className="flex-1 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
                  {config.enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => { setShowTestDialog(config.channel); setTestRecipient(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  <Send className="w-3 h-3" /> Test
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
              <button onClick={() => setShowTestDialog(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <input value={testRecipient} onChange={e => setTestRecipient(e.target.value)}
              placeholder={showTestDialog === 'EMAIL' ? 'test@example.com' : showTestDialog === 'SMS' ? '+234...' : 'device-token'}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button onClick={() => handleTest(showTestDialog as NotificationChannel)} disabled={!testRecipient || testingChannel !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {testingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
