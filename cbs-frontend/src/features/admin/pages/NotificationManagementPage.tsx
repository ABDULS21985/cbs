import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Bell, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TemplateTable } from '../components/notifications/TemplateTable';
import { TemplateEditor } from '../components/notifications/TemplateEditor';
import { TemplatePreview } from '../components/notifications/TemplatePreview';
import { TemplateVersionHistory } from '../components/notifications/TemplateVersionHistory';
import { TemplateTestPanel } from '../components/notifications/TemplateTestPanel';
import { ChannelConfigPanel } from '../components/notifications/ChannelConfigPanel';
import { DeliveryDashboard } from '../components/notifications/DeliveryDashboard';
import { FailureAnalysisTable } from '../components/notifications/FailureAnalysisTable';
import { ScheduledNotificationsTable } from '../components/notifications/ScheduledNotificationsTable';
import { ScheduleCreator } from '../components/notifications/ScheduleCreator';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  previewTemplate,
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
  { value: 'WEBHOOK', label: 'Webhook' },
];

const selectClass = 'rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

export function NotificationManagementPage() {
  useEffect(() => { document.title = 'Notifications | CBS'; }, []);
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  // Templates
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [filterChannel, setFilterChannel] = useState<NotificationChannel | ''>('');
  const [filterSearch, setFilterSearch] = useState('');

  // Preview / Version History / Test Send panels
  const [previewData, setPreviewData] = useState<TemplatePreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Channels
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // Delivery
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({ total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, deliveryRatePct: 0, failureRatePct: 0 });
  const [deliveryTrend, setDeliveryTrend] = useState<DeliveryTrendEntry[]>([]);
  const [deliveryByChannel, setDeliveryByChannel] = useState<DeliveryByChannelEntry[]>([]);
  const [failureRecords, setFailureRecords] = useState<FailureRecord[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Schedules
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [showScheduleCreator, setShowScheduleCreator] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      let results = await getTemplates();
      if (filterChannel) results = results.filter(t => t.channel === filterChannel);
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        results = results.filter(t => t.templateName.toLowerCase().includes(q) || t.templateCode.toLowerCase().includes(q));
      }
      setTemplates(results);
    } catch (error) {
      setTemplatesError(error instanceof Error ? error.message : 'Notification templates could not be loaded.');
    } finally { setTemplatesLoading(false); }
  }, [filterChannel, filterSearch]);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError(null);
    try { setChannelConfigs(await getChannelConfigs()); } catch (error) {
      setChannelsError(error instanceof Error ? error.message : 'Notification channels could not be loaded.');
    } finally { setChannelsLoading(false); }
  }, []);

  const loadDelivery = useCallback(async () => {
    setDeliveryLoading(true);
    setDeliveryError(null);
    try {
      const [stats, trend, byChannel, failures] = await Promise.all([
        getDeliveryStats(), getDeliveryTrend(), getDeliveryByChannel(), getDeliveryFailures(),
      ]);
      setDeliveryStats(stats);
      setDeliveryTrend(trend);
      setDeliveryByChannel(byChannel);
      setFailureRecords(failures);
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : 'Notification delivery metrics could not be loaded.');
    } finally { setDeliveryLoading(false); }
  }, []);

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    setSchedulesError(null);
    try { setSchedules(await getScheduledNotifications()); } catch (error) {
      setSchedulesError(error instanceof Error ? error.message : 'Scheduled notifications could not be loaded.');
    } finally { setSchedulesLoading(false); }
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
      toast.success('Template saved');
    } else {
      const created = await createTemplate(data);
      setSelectedTemplate(created);
      setTemplates(prev => [created, ...prev]);
      toast.success('Template created');
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
    toast.success('Template published');
  };

  const handleArchiveTemplate = async (id: number | string) => {
    const archived = await archiveTemplate(id);
    setTemplates(prev => prev.map(t => (t.id === archived.id ? archived : t)));
    if (selectedTemplate?.id === Number(id)) setSelectedTemplate(archived);
    toast.success('Template archived');
  };

  const handlePreviewTemplate = async (tpl: NotificationTemplate) => {
    const preview = await previewTemplate(tpl.id);
    setPreviewData(preview);
    setShowPreview(true);
  };

  const handleRestoreVersion = (bodyTemplate: string) => {
    // This will be called from VersionHistory when user clicks "Restore"
    // We need to save the restored body as a new version
    if (selectedTemplate) {
      handleSaveTemplate({ ...selectedTemplate, bodyTemplate });
    }
  };

  // ── Channel actions ───────────────────────────────────────────────────────

  const handleUpdateChannel = async (channel: NotificationChannel, data: Partial<ChannelConfig>) => {
    const updated = await updateChannelConfig(channel, data);
    setChannelConfigs(prev => prev.map(c => (c.channel === channel ? updated : c)));
    toast.success(`${channel} channel ${data.enabled ? 'enabled' : 'disabled'}`);
  };

  const handleTestChannel = async (channel: NotificationChannel, recipient: string) => {
    await testChannelSend(channel, recipient);
  };

  const handleToggleSchedule = async (id: number | string) => {
    const updated = await toggleSchedule(id);
    setSchedules(prev => prev.map(s => (s.id === Number(id) ? updated : s)));
    toast.success(`Schedule ${updated.status === 'ACTIVE' ? 'resumed' : 'paused'}`);
  };

  return (
    <>
      <PageHeader
        title="Notification Management"
        subtitle="Manage notification templates, delivery channels, and scheduled campaigns"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'templates' && (
              <button onClick={handleNewTemplate}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> New Template
              </button>
            )}
            {activeTab === 'schedules' && (
              <button onClick={() => setShowScheduleCreator(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Calendar className="w-4 h-4" /> New Schedule
              </button>
            )}
          </div>
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
            <div className="flex-1 min-w-0">
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
                ) : templatesError ? (
                  <div className="px-4 py-3 text-sm text-red-700">{templatesError}</div>
                ) : (
                  <TemplateTable
                    templates={templates}
                    onEdit={handleEditTemplate}
                    onArchive={handleArchiveTemplate}
                    onPreview={handlePreviewTemplate}
                    onTestSend={(tpl) => { setSelectedTemplate(tpl); setShowTestPanel(true); }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{templates.length} template{templates.length !== 1 ? 's' : ''} found</p>
            </div>

            {showEditor && (
              <div className="w-[520px] shrink-0">
                <div className="bg-card rounded-lg border border-border p-5 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-sm">{selectedTemplate ? 'Edit Template' : 'New Template'}</h2>
                      {selectedTemplate && (
                        <span className="text-xs text-muted-foreground">v{selectedTemplate.version}</span>
                      )}
                    </div>
                    <button onClick={handleCloseEditor} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <TemplateEditor
                    template={selectedTemplate}
                    onSave={handleSaveTemplate}
                    onPublish={handlePublishTemplate}
                    onTestSend={selectedTemplate ? () => setShowTestPanel(true) : undefined}
                    onVersionHistory={selectedTemplate ? () => setShowVersionHistory(true) : undefined}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          channelsLoading ? (
            <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
          ) : channelsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{channelsError}</div>
          ) : (
            <ChannelConfigPanel configs={channelConfigs} onUpdate={handleUpdateChannel} onTest={handleTestChannel} />
          )
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          deliveryLoading ? (
            <div className="py-16 text-center"><div className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div></div>
          ) : deliveryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{deliveryError}</div>
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
          ) : schedulesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{schedulesError}</div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Scheduled Notifications</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {schedules.filter(s => s.status === 'ACTIVE').length} active, {schedules.filter(s => s.status === 'PAUSED').length} paused
                  </p>
                </div>
                <button onClick={() => setShowScheduleCreator(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium hover:bg-muted transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Schedule
                </button>
              </div>
              <ScheduledNotificationsTable scheduled={schedules} onToggle={handleToggleSchedule} />
            </div>
          )
        )}
      </div>

      {/* Preview Modal */}
      <TemplatePreview preview={previewData} open={showPreview} onClose={() => setShowPreview(false)} />

      {/* Version History Panel */}
      {showVersionHistory && selectedTemplate && (
        <TemplateVersionHistory
          template={selectedTemplate}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Test Send Panel */}
      {showTestPanel && selectedTemplate && (
        <TemplateTestPanel
          template={selectedTemplate}
          onClose={() => setShowTestPanel(false)}
        />
      )}

      {/* Schedule Creator */}
      {showScheduleCreator && (
        <ScheduleCreator
          templates={templates}
          onClose={() => setShowScheduleCreator(false)}
          onSuccess={loadSchedules}
        />
      )}
    </>
  );
}
