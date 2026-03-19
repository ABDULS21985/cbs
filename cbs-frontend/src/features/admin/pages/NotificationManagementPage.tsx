import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { TemplateTable } from '../components/notifications/TemplateTable';
import { TemplateEditor } from '../components/notifications/TemplateEditor';
import { TemplatePreview } from '../components/notifications/TemplatePreview';
import { ChannelConfigPanel } from '../components/notifications/ChannelConfigPanel';
import { DeliveryDashboard } from '../components/notifications/DeliveryDashboard';
import { FailureAnalysisTable } from '../components/notifications/FailureAnalysisTable';
import { ScheduledNotificationsTable } from '../components/notifications/ScheduledNotificationsTable';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  previewTemplate,
  testSendTemplate,
  getChannelConfigs,
  updateChannelConfig,
  testChannelSend,
  getDeliveryStats,
  getDeliveryTrend,
  getDeliveryByChannel,
  getDeliveryFailures,
  getScheduledNotifications,
  toggleSchedule,
  type NotificationTemplate,
  type NotificationChannel,
  type ChannelConfig,
  type DeliveryStats,
  type DeliveryTrendEntry,
  type DeliveryByChannelEntry,
  type FailureRecord,
  type ScheduledNotification,
  type TemplatePreview as TemplatePreviewData,
} from '../api/notificationAdminApi';

type Tab = 'templates' | 'channels' | 'delivery' | 'schedules';

const TABS: { key: Tab; label: string }[] = [
  { key: 'templates', label: 'Templates' },
  { key: 'channels', label: 'Channels' },
  { key: 'delivery', label: 'Delivery Dashboard' },
  { key: 'schedules', label: 'Schedules' },
];

const CHANNEL_OPTIONS: Array<{ value: NotificationChannel | ''; label: string }> = [
  { value: '', label: 'All Channels' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In-App' },
];

const selectClass = 'rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

export function NotificationManagementPage() {
  useEffect(() => { document.title = 'Notifications | CBS'; }, []);
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  // Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [filterChannel, setFilterChannel] = useState<NotificationChannel | ''>('');
  const [filterSearch, setFilterSearch] = useState('');

  // Preview
  const [previewData, setPreviewData] = useState<TemplatePreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Test Send
  const [testSendTemplate2, setTestSendTemplate2] = useState<NotificationTemplate | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Channels
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Delivery
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({ total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, deliveryRatePct: 0, failureRatePct: 0 });
  const [deliveryTrend, setDeliveryTrend] = useState<DeliveryTrendEntry[]>([]);
  const [deliveryByChannel, setDeliveryByChannel] = useState<DeliveryByChannelEntry[]>([]);
  const [failureRecords, setFailureRecords] = useState<FailureRecord[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Schedules
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      let results = await getTemplates();
      if (filterChannel) results = results.filter(t => t.channel === filterChannel);
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        results = results.filter(t => t.templateName.toLowerCase().includes(q) || t.templateCode.toLowerCase().includes(q));
      }
      setTemplates(results);
    } finally { setTemplatesLoading(false); }
  }, [filterChannel, filterSearch]);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try { setChannelConfigs(await getChannelConfigs()); } finally { setChannelsLoading(false); }
  }, []);

  const loadDelivery = useCallback(async () => {
    setDeliveryLoading(true);
    try {
      const [stats, trend, byChannel, failures] = await Promise.all([
        getDeliveryStats(), getDeliveryTrend(), getDeliveryByChannel(), getDeliveryFailures(),
      ]);
      setDeliveryStats(stats);
      setDeliveryTrend(trend);
      setDeliveryByChannel(byChannel);
      setFailureRecords(failures);
    } finally { setDeliveryLoading(false); }
  }, []);

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try { setSchedules(await getScheduledNotifications()); } finally { setSchedulesLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'templates') loadTemplates(); }, [activeTab, loadTemplates]);
  useEffect(() => { if (activeTab === 'channels') loadChannels(); }, [activeTab, loadChannels]);
  useEffect(() => { if (activeTab === 'delivery') loadDelivery(); }, [activeTab, loadDelivery]);
  useEffect(() => { if (activeTab === 'schedules') loadSchedules(); }, [activeTab, loadSchedules]);

  // ── Template actions ──────────────────────────────────────────────────────

  const handleEditTemplate = (tpl: NotificationTemplate) => { setSelectedTemplate(tpl); setShowEditor(true); };
  const handleNewTemplate = () => { setSelectedTemplate(undefined); setShowEditor(true); };
  const handleCloseEditor = () => { setShowEditor(false); setSelectedTemplate(undefined); };

  const handleSaveTemplate = async (data: Partial<NotificationTemplate>) => {
    if (selectedTemplate) {
      const updated = await updateTemplate(selectedTemplate.id, data);
      setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
    } else {
      const created = await createTemplate(data);
      setSelectedTemplate(created);
      setTemplates(prev => [created, ...prev]);
    }
  };

  const handlePublishTemplate = async (data: Partial<NotificationTemplate>) => {
    if (selectedTemplate) {
      await updateTemplate(selectedTemplate.id, data);
      const published = await publishTemplate(selectedTemplate.id);
      setTemplates(prev => prev.map(t => (t.id === published.id ? published : t)));
      setSelectedTemplate(published);
    } else {
      const created = await createTemplate(data);
      const published = await publishTemplate(created.id);
      setSelectedTemplate(published);
      setTemplates(prev => [published, ...prev]);
    }
  };

  const handleArchiveTemplate = async (id: number | string) => {
    const archived = await archiveTemplate(id);
    setTemplates(prev => prev.map(t => (t.id === archived.id ? archived : t)));
    if (selectedTemplate?.id === Number(id)) setSelectedTemplate(archived);
  };

  const handlePreviewTemplate = async (tpl: NotificationTemplate) => {
    const preview = await previewTemplate(tpl.id);
    setPreviewData(preview);
    setShowPreview(true);
  };

  const handleTestSendOpen = (tpl: NotificationTemplate) => {
    setTestSendTemplate2(tpl);
    setTestRecipient('');
    setTestResult(null);
  };

  const handleTestSend = async () => {
    if (!testSendTemplate2 || !testRecipient) return;
    setTestSending(true);
    try {
      const result = await testSendTemplate(testSendTemplate2.id, testRecipient);
      setTestResult({ success: result.success, message: result.success ? 'Test sent successfully!' : 'Test failed.' });
    } catch {
      setTestResult({ success: false, message: 'Test send failed.' });
    } finally { setTestSending(false); }
  };

  // ── Channel actions ───────────────────────────────────────────────────────

  const handleUpdateChannel = async (channel: NotificationChannel, data: Partial<ChannelConfig>) => {
    const updated = await updateChannelConfig(channel, data);
    setChannelConfigs(prev => prev.map(c => (c.channel === channel ? updated : c)));
  };

  const handleTestChannel = async (channel: NotificationChannel, recipient: string) => {
    await testChannelSend(channel, recipient);
  };

  const handleToggleSchedule = async (id: number | string) => {
    const updated = await toggleSchedule(id);
    setSchedules(prev => prev.map(s => (s.id === Number(id) ? updated : s)));
  };

  return (
    <>
      <PageHeader
        title="Notification Management"
        subtitle="Manage notification templates, delivery channels, and scheduled campaigns"
        actions={
          activeTab === 'templates' ? (
            <button onClick={handleNewTemplate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> New Template
            </button>
          ) : null
        }
      />

      <div className="page-container space-y-6">
        {/* Tabs */}
        <div className="border-b border-border -mb-2">
          <nav className="-mb-px flex gap-6">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn('pb-3 text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent')}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className={cn('flex gap-4', showEditor ? 'items-start' : '')}>
            <div className={cn('flex-1 min-w-0')}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Search by name or code..." value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground" />
                </div>
                <select className={selectClass} value={filterChannel} onChange={e => setFilterChannel(e.target.value as NotificationChannel | '')}>
                  {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-hidden">
                {templatesLoading ? (
                  <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
                ) : (
                  <TemplateTable templates={templates} onEdit={handleEditTemplate} onArchive={handleArchiveTemplate}
                    onPreview={handlePreviewTemplate} onTestSend={handleTestSendOpen} />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{templates.length} template{templates.length !== 1 ? 's' : ''} found</p>
            </div>

            {showEditor && (
              <div className="w-[480px] shrink-0">
                <div className="bg-card rounded-lg border border-border p-5 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-sm">{selectedTemplate ? 'Edit Template' : 'New Template'}</h2>
                    </div>
                    <button onClick={handleCloseEditor} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                  <TemplateEditor template={selectedTemplate} onSave={handleSaveTemplate} onPublish={handlePublishTemplate} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          channelsLoading ? (
            <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
          ) : (
            <ChannelConfigPanel configs={channelConfigs} onUpdate={handleUpdateChannel} onTest={handleTestChannel} />
          )
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          deliveryLoading ? (
            <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
          ) : (
            <div className="space-y-6">
              <DeliveryDashboard stats={deliveryStats} trend={deliveryTrend} byChannel={deliveryByChannel} />
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Recent Failures</h3>
                  <span className="text-xs text-muted-foreground">{failureRecords.length} failures</span>
                </div>
                <FailureAnalysisTable failures={failureRecords} />
              </div>
            </div>
          )
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          schedulesLoading ? (
            <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-sm">Scheduled Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedules.filter(s => s.status === 'ACTIVE').length} active, {schedules.filter(s => s.status === 'PAUSED').length} paused
                </p>
              </div>
              <ScheduledNotificationsTable scheduled={schedules} onToggle={handleToggleSchedule} />
            </div>
          )
        )}
      </div>

      {/* Preview Modal */}
      <TemplatePreview preview={previewData} open={showPreview} onClose={() => setShowPreview(false)} />

      {/* Test Send Modal */}
      {testSendTemplate2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setTestSendTemplate2(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Test Send: {testSendTemplate2.templateName}</h3>
              <button onClick={() => setTestSendTemplate2(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Send a test notification to verify template rendering.</p>
            <input value={testRecipient} onChange={e => setTestRecipient(e.target.value)}
              placeholder={testSendTemplate2.channel === 'EMAIL' ? 'test@example.com' : '+234...'}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {testResult && (
              <p className={cn('text-xs', testResult.success ? 'text-green-600' : 'text-red-600')}>{testResult.message}</p>
            )}
            <button onClick={handleTestSend} disabled={!testRecipient || testSending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Send Test
            </button>
          </div>
        </div>
      )}
    </>
  );
}
