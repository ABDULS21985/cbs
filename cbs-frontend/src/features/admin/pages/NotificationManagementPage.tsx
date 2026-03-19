import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { TemplateTable } from '../components/notifications/TemplateTable';
import { TemplateEditor } from '../components/notifications/TemplateEditor';
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
  getChannelConfigs,
  updateChannelConfig,
  testChannelSend,
  getDeliveryStats,
  getFailureRecords,
  getScheduledNotifications,
  toggleSchedule,
  type NotificationTemplate,
  type NotificationChannel,
  type NotificationCategory,
  type TemplateStatus,
  type ChannelConfig,
  type DeliveryStats,
  type FailureRecord,
  type ScheduledNotification,
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

const CATEGORY_OPTIONS: Array<{ value: NotificationCategory | ''; label: string }> = [
  { value: '', label: 'All Categories' },
  { value: 'TRANSACTION', label: 'Transaction' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'LOAN', label: 'Loan' },
  { value: 'CARD', label: 'Card' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SYSTEM', label: 'System' },
];

const STATUS_OPTIONS: Array<{ value: TemplateStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const selectClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

export function NotificationManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(false);
  const [filterChannel, setFilterChannel] = useState<NotificationChannel | ''>('');
  const [filterCategory, setFilterCategory] = useState<NotificationCategory | ''>('');
  const [filterStatus, setFilterStatus] = useState<TemplateStatus | ''>('');
  const [filterSearch, setFilterSearch] = useState('');

  // Channels state
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Delivery state
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats[]>([]);
  const [failureRecords, setFailureRecords] = useState<FailureRecord[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const results = await getTemplates({
        channel: filterChannel || undefined,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
        search: filterSearch || undefined,
      });
      setTemplates(results);
    } finally {
      setTemplatesLoading(false);
    }
  }, [filterChannel, filterCategory, filterStatus, filterSearch]);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const configs = await getChannelConfigs();
      setChannelConfigs(configs);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const loadDelivery = useCallback(async () => {
    setDeliveryLoading(true);
    try {
      const [stats, failures] = await Promise.all([
        getDeliveryStats(30),
        getFailureRecords(),
      ]);
      setDeliveryStats(stats);
      setFailureRecords(failures);
    } finally {
      setDeliveryLoading(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const scheds = await getScheduledNotifications();
      setSchedules(scheds);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') loadTemplates();
  }, [activeTab, loadTemplates]);

  useEffect(() => {
    if (activeTab === 'channels') loadChannels();
  }, [activeTab, loadChannels]);

  useEffect(() => {
    if (activeTab === 'delivery') loadDelivery();
  }, [activeTab, loadDelivery]);

  useEffect(() => {
    if (activeTab === 'schedules') loadSchedules();
  }, [activeTab, loadSchedules]);

  // ── Template actions ─────────────────────────────────────────────────────────

  const handleEditTemplate = (tpl: NotificationTemplate) => {
    setSelectedTemplate(tpl);
    setShowEditor(true);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(undefined);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedTemplate(undefined);
  };

  const handleSaveTemplate = async (data: Partial<NotificationTemplate>) => {
    if (selectedTemplate) {
      const updated = await updateTemplate(selectedTemplate.id, data);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
    } else {
      const created = await createTemplate(data);
      setSelectedTemplate(created);
      setTemplates((prev) => [created, ...prev]);
    }
  };

  const handlePublishTemplate = async (data: Partial<NotificationTemplate>) => {
    if (selectedTemplate) {
      await updateTemplate(selectedTemplate.id, data);
      const published = await publishTemplate(selectedTemplate.id);
      setTemplates((prev) => prev.map((t) => (t.id === published.id ? published : t)));
      setSelectedTemplate(published);
    } else {
      const created = await createTemplate(data);
      const published = await publishTemplate(created.id);
      setSelectedTemplate(published);
      setTemplates((prev) => [published, ...prev]);
    }
  };

  const handleArchiveTemplate = async (id: string) => {
    const archived = await archiveTemplate(id);
    setTemplates((prev) => prev.map((t) => (t.id === archived.id ? archived : t)));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(archived);
    }
  };

  // ── Channel actions ──────────────────────────────────────────────────────────

  const handleUpdateChannelConfig = async (channel: NotificationChannel, data: Partial<ChannelConfig>) => {
    const updated = await updateChannelConfig(channel, data);
    setChannelConfigs((prev) => prev.map((c) => (c.channel === channel ? updated : c)));
  };

  const handleTestChannelSend = async (channel: NotificationChannel, recipient: string) => {
    await testChannelSend(channel, recipient);
  };

  // ── Schedule actions ─────────────────────────────────────────────────────────

  const handleToggleSchedule = async (id: string) => {
    const updated = await toggleSchedule(id);
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Notification Management"
        subtitle="Manage notification templates, delivery channels, and scheduled campaigns"
        actions={
          activeTab === 'templates' ? (
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          ) : activeTab === 'schedules' ? (
            <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Schedule
            </button>
          ) : null
        }
      />

      <div className="page-container space-y-6">
        {/* Tabs */}
        <div className="border-b border-border -mb-2">
          <nav className="-mb-px flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'pb-3 text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Templates Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div className={cn('flex gap-4', showEditor ? 'items-start' : '')}>
            {/* Left: table + filters */}
            <div className={cn('flex-1 min-w-0', showEditor ? 'max-w-none' : '')}>
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
                <select
                  className={selectClass}
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value as NotificationChannel | '')}
                >
                  {CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as NotificationCategory | '')}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TemplateStatus | '')}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                {templatesLoading ? (
                  <div className="py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading templates...
                    </div>
                  </div>
                ) : (
                  <TemplateTable
                    templates={templates}
                    onEdit={handleEditTemplate}
                    onArchive={handleArchiveTemplate}
                  />
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                {templates.length} template{templates.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Right: slide-in editor */}
            {showEditor && (
              <div className="w-[480px] shrink-0">
                <div className="bg-card rounded-lg border border-border p-5 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-sm">
                        {selectedTemplate ? 'Edit Template' : 'New Template'}
                      </h2>
                      {selectedTemplate && (
                        <span className="text-xs text-muted-foreground">(v{selectedTemplate.version})</span>
                      )}
                    </div>
                    <button
                      onClick={handleCloseEditor}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <TemplateEditor
                    template={selectedTemplate}
                    onSave={handleSaveTemplate}
                    onPublish={handlePublishTemplate}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Channels Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'channels' && (
          <>
            {channelsLoading ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading channel configurations...
                </div>
              </div>
            ) : (
              <ChannelConfigPanel
                configs={channelConfigs}
                onUpdate={handleUpdateChannelConfig}
                onTest={handleTestChannelSend}
              />
            )}
          </>
        )}

        {/* ── Delivery Dashboard Tab ────────────────────────────────────────── */}
        {activeTab === 'delivery' && (
          <>
            {deliveryLoading ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading delivery data...
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <DeliveryDashboard stats={deliveryStats} />
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Failure Analysis</h3>
                    <span className="text-xs text-muted-foreground">{failureRecords.length} templates with failures</span>
                  </div>
                  <FailureAnalysisTable failures={failureRecords} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Schedules Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'schedules' && (
          <>
            {schedulesLoading ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading schedules...
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Scheduled Notifications</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {schedules.filter((s) => s.status === 'ACTIVE').length} active,{' '}
                      {schedules.filter((s) => s.status === 'PAUSED').length} paused
                    </p>
                  </div>
                </div>
                <ScheduledNotificationsTable
                  scheduled={schedules}
                  onToggle={handleToggleSchedule}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
