import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Eye, Send, Archive, Copy, Pencil, Search, X } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import {
  useNotificationTemplates,
  useCreateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
} from '../hooks/useCommunications';
import type { NotificationTemplate } from '../api/communicationApi';
import { TemplateTable } from '../components/templates/TemplateTable';
import { TemplateEditor } from '../components/templates/TemplateEditor';
import { TemplateTestSendDialog } from '../components/templates/TemplateTestSendDialog';
import { TemplateCategoryFilter } from '../components/templates/TemplateCategoryFilter';

const CHANNEL_FILTERS: { value: string; label: string; icon: string }[] = [
  { value: '', label: 'All', icon: '' },
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'SMS', label: 'SMS', icon: '📱' },
  { value: 'PUSH', label: 'Push', icon: '🔔' },
  { value: 'IN_APP', label: 'In-App', icon: '📄' },
];

// ── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown({ template, onEdit, onPreview, onTest, onPublish, onArchive, onClone }: {
  template: NotificationTemplate;
  onEdit: () => void; onPreview: () => void; onTest: () => void;
  onPublish: () => void; onArchive: () => void; onClone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-md hover:bg-muted">
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 surface-card shadow-lg py-1">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Pencil className="w-3.5 h-3.5" /> Edit</button>
          <button onClick={() => { onPreview(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Eye className="w-3.5 h-3.5" /> Preview</button>
          <button onClick={() => { onTest(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Send className="w-3.5 h-3.5" /> Test Send</button>
          {!template.isActive ? (
            <button onClick={() => { onPublish(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"><Archive className="w-3.5 h-3.5" /> Publish</button>
          ) : (
            <button onClick={() => { onArchive(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"><Archive className="w-3.5 h-3.5" /> Archive</button>
          )}
          <button onClick={() => { onClone(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Copy className="w-3.5 h-3.5" /> Clone</button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function TemplateManagementPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useNotificationTemplates();
  const createMut = useCreateTemplate();
  const publishMut = usePublishTemplate();
  const archiveMut = useArchiveTemplate();

  const [showCreate, setShowCreate] = useState(false);
  const [testTarget, setTestTarget] = useState<NotificationTemplate | null>(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    let result = templates;
    if (channelFilter) result = result.filter(t => t.channel === channelFilter);
    if (categoryFilter) result = result.filter(t => t.eventType === categoryFilter);
    if (statusFilter === 'Active') result = result.filter(t => t.isActive);
    if (statusFilter === 'Archived') result = result.filter(t => !t.isActive);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => t.templateName.toLowerCase().includes(q) || t.templateCode.toLowerCase().includes(q));
    }
    return result;
  }, [templates, channelFilter, categoryFilter, statusFilter, searchTerm]);

  const activeCount = templates.filter(t => t.isActive).length;
  const archivedCount = templates.filter(t => !t.isActive).length;

  const handleCreate = (data: Partial<NotificationTemplate>) => {
    createMut.mutate(data, {
      onSuccess: (created) => { toast.success('Template created'); setShowCreate(false); navigate(`/communications/templates/${created.id}`); },
      onError: () => toast.error('Failed to create template'),
    });
  };

  const handleClone = (template: NotificationTemplate) => {
    createMut.mutate({
      ...template,
      id: undefined,
      templateCode: template.templateCode + '-COPY',
      templateName: template.templateName + ' (Copy)',
      isActive: false,
    } as Partial<NotificationTemplate>, {
      onSuccess: (created) => { toast.success('Template cloned'); navigate(`/communications/templates/${created.id}`); },
    });
  };

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader
        title="Communication Templates"
        subtitle="Manage notification templates for all channels"
        actions={
          <RoleGuard roles="CBS_ADMIN">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Create Template
            </button>
          </RoleGuard>
        }
      />

      <div className="page-container space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Templates</div>
            <div className="stat-value">{templates.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value text-green-700">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Archived</div>
            <div className="stat-value text-muted-foreground">{archivedCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Channels</div>
            <div className="stat-value">{new Set(templates.map(t => t.channel)).size}</div>
          </div>
        </div>

        {/* Channel filter (segmented toggle) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CHANNEL_FILTERS.map((ch) => (
            <button key={ch.value} onClick={() => setChannelFilter(ch.value)} className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              channelFilter === ch.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}>
              {ch.icon && <span className="mr-1">{ch.icon}</span>}{ch.label}
            </button>
          ))}
        </div>

        {/* Category + Status + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <TemplateCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search templates..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {(channelFilter || categoryFilter || statusFilter || searchTerm) && (
            <button onClick={() => { setChannelFilter(''); setCategoryFilter(''); setStatusFilter(''); setSearchTerm(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <TemplateTable
          templates={filtered}
          isLoading={isLoading}
          onRowClick={(t) => navigate(`/communications/templates/${t.id}`)}
          renderActions={(t) => (
            <ActionsDropdown
              template={t}
              onEdit={() => navigate(`/communications/templates/${t.id}`)}
              onPreview={() => navigate(`/communications/templates/${t.id}?tab=preview`)}
              onTest={() => setTestTarget(t)}
              onPublish={() => publishMut.mutate(t.id, { onSuccess: () => toast.success('Published') })}
              onArchive={() => archiveMut.mutate(t.id, { onSuccess: () => toast.success('Archived') })}
              onClone={() => handleClone(t)}
            />
          )}
        />
      </div>

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">Create Template</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <TemplateEditor isNew onSave={handleCreate} isSaving={createMut.isPending} />
            </div>
          </div>
        </div>
      )}

      {/* Test Send Dialog */}
      {testTarget && (
        <TemplateTestSendDialog templateId={testTarget.id} channel={testTarget.channel} onClose={() => setTestTarget(null)} />
      )}
    </>
  );
}
