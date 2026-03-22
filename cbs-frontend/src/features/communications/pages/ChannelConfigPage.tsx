import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageSquare, Bell, MonitorSmartphone, Globe, Send, X, Loader2, Edit2, CheckCircle2, XCircle, Shield, Clock } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { notificationApi, type ChannelConfig } from '../api/communicationApi';
import { formatDateTime } from '@/lib/formatters';

const CHANNEL_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  EMAIL: { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  SMS: { icon: MessageSquare, label: 'SMS', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  PUSH: { icon: Bell, label: 'Push Notifications', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
  IN_APP: { icon: MonitorSmartphone, label: 'In-App', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  WEBHOOK: { icon: Globe, label: 'Webhook', color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400' },
};

function ChannelCard({ config, onTest, onEdit }: { config: ChannelConfig; onTest: () => void; onEdit: () => void }) {
  const meta = CHANNEL_META[config.channel] || CHANNEL_META.EMAIL;
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-lg', meta.color)}><Icon className="w-5 h-5" /></div>
          <div>
            <h3 className="font-semibold text-sm">{meta.label}</h3>
            <p className="text-xs text-muted-foreground">Provider: {config.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', config.enabled ? 'bg-green-500' : 'bg-gray-400')} />
          <span className="text-xs font-medium">{config.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {/* Config details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {config.senderAddress && (
          <>
            <span className="text-muted-foreground">Sender</span>
            <span className="font-mono truncate">{config.senderAddress}</span>
          </>
        )}
        <span className="text-muted-foreground">Rate Limit</span>
        <span>{config.rateLimit}/min</span>
        <span className="text-muted-foreground">Retry</span>
        <span>{config.retryEnabled ? `Enabled (max ${config.maxRetries})` : 'Disabled'}</span>
        {config.updatedAt && (
          <>
            <span className="text-muted-foreground">Updated</span>
            <span>{formatDateTime(config.updatedAt)}</span>
          </>
        )}
      </div>

      <RoleGuard roles="CBS_ADMIN">
        <div className="flex gap-2">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Configure
          </button>
          <button onClick={onTest} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            <Send className="w-3.5 h-3.5" /> Test Send
          </button>
        </div>
      </RoleGuard>
    </div>
  );
}

export function ChannelConfigPage() {
  useEffect(() => { document.title = 'Notification Channels | CBS'; }, []);
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['notifications', 'channels'],
    queryFn: () => notificationApi.getChannels(),
  });

  // Test state
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; status?: string }>>({});

  // Edit state
  const [editingConfig, setEditingConfig] = useState<ChannelConfig | null>(null);
  const [editForm, setEditForm] = useState({
    enabled: true,
    provider: '',
    senderAddress: '',
    rateLimit: 100,
    retryEnabled: true,
    maxRetries: 3,
  });

  const testMutation = useMutation({
    mutationFn: ({ channel, recipient }: { channel: string; recipient: string }) =>
      notificationApi.testChannel(channel, recipient),
    onSuccess: (data, { channel }) => {
      setTestResults(prev => ({ ...prev, [channel]: { success: data.success, status: (data as Record<string, unknown>).status as string } }));
      toast.success(data.success ? `Test ${channel} sent successfully` : `Test ${channel} failed`);
      setTestingChannel(null);
    },
    onError: (_err, { channel }) => {
      setTestResults(prev => ({ ...prev, [channel]: { success: false } }));
      toast.error(`Test ${channel} failed`);
      setTestingChannel(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ channel, data }: { channel: string; data: Record<string, unknown> }) =>
      notificationApi.updateChannel(channel, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'channels'] });
      toast.success('Channel configuration saved');
      setEditingConfig(null);
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  const handleEdit = (config: ChannelConfig) => {
    setEditingConfig(config);
    setEditForm({
      enabled: config.enabled,
      provider: config.provider,
      senderAddress: config.senderAddress ?? '',
      rateLimit: config.rateLimit,
      retryEnabled: config.retryEnabled,
      maxRetries: config.maxRetries,
    });
  };

  const handleSave = () => {
    if (!editingConfig) return;
    updateMutation.mutate({
      channel: editingConfig.channel,
      data: {
        enabled: editForm.enabled,
        provider: editForm.provider,
        senderAddress: editForm.senderAddress || null,
        rateLimit: editForm.rateLimit,
        retryEnabled: editForm.retryEnabled,
        maxRetries: editForm.maxRetries,
      },
    });
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Notification Channels" subtitle="Configure and test delivery channel providers — settings are persisted to database" />

      <div className="page-container">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-lg bg-muted/30 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map(ch => (
              <div key={ch.channel}>
                <ChannelCard
                  config={ch}
                  onTest={() => { setTestingChannel(ch.channel); setTestRecipient(''); }}
                  onEdit={() => handleEdit(ch)}
                />
                {testResults[ch.channel] && (
                  <div className={cn('mt-2 flex items-center gap-2 rounded-lg border px-3 py-2',
                    testResults[ch.channel].success ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200')}>
                    {testResults[ch.channel].success ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    <span className={cn('text-xs font-medium', testResults[ch.channel].success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                      {testResults[ch.channel].success ? 'Test sent successfully' : 'Test failed'}
                      {testResults[ch.channel].status && ` (${testResults[ch.channel].status})`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Send Dialog */}
      {testingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setTestingChannel(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Test {testingChannel} Delivery</h3>
              <button onClick={() => setTestingChannel(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Sends a real test notification through the configured provider.</p>
            <input value={testRecipient} onChange={e => setTestRecipient(e.target.value)}
              placeholder={testingChannel === 'EMAIL' ? 'test@example.com' : testingChannel === 'SMS' ? '+234...' : 'device-token'}
              className={fc} />
            <button onClick={() => testMutation.mutate({ channel: testingChannel, recipient: testRecipient })}
              disabled={!testRecipient || testMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test
            </button>
          </div>
        </div>
      )}

      {/* Edit Config Dialog */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setEditingConfig(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h3 className="font-semibold text-sm">Configure {editingConfig.channel}</h3>
              <button onClick={() => setEditingConfig(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Enabled */}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.enabled} onChange={e => setEditForm(p => ({ ...p, enabled: e.target.checked }))} className="rounded" />
                <span className="text-sm font-medium">Channel Enabled</span>
              </label>

              {/* Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Provider</label>
                <input value={editForm.provider} onChange={e => setEditForm(p => ({ ...p, provider: e.target.value }))} className={fc} placeholder="SMTP / TWILIO / FIREBASE" />
              </div>

              {/* Sender Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sender Address / From ID</label>
                <input value={editForm.senderAddress} onChange={e => setEditForm(p => ({ ...p, senderAddress: e.target.value }))} className={fc}
                  placeholder={editingConfig.channel === 'EMAIL' ? 'noreply@digicore.bank' : editingConfig.channel === 'SMS' ? '+234800000000' : ''} />
              </div>

              {/* Rate Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Rate Limit (msgs/min)</label>
                <input type="number" value={editForm.rateLimit} onChange={e => setEditForm(p => ({ ...p, rateLimit: Number(e.target.value) }))} className={cn(fc, 'w-32')} min={1} />
              </div>

              {/* Retry */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editForm.retryEnabled} onChange={e => setEditForm(p => ({ ...p, retryEnabled: e.target.checked }))} className="rounded" />
                  <span className="text-sm font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Retry on Failure</span>
                </label>
                {editForm.retryEnabled && (
                  <div className="space-y-1.5 pl-6">
                    <label className="text-xs font-medium text-muted-foreground">Max Retries</label>
                    <input type="number" value={editForm.maxRetries} onChange={e => setEditForm(p => ({ ...p, maxRetries: Number(e.target.value) }))} className={cn(fc, 'w-24')} min={1} max={10} />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setEditingConfig(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleSave} disabled={updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
