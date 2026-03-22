import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Send, Archive, CheckCircle } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import {
  useNotificationTemplate,
  useUpdateTemplate,
  usePublishTemplate,
  useArchiveTemplate,
} from '../hooks/useCommunications';
import { notificationApi } from '../api/communicationApi';
import { TemplateEditor } from '../components/templates/TemplateEditor';
import { TemplatePreview } from '../components/templates/TemplatePreview';
import { TemplateTestSendDialog } from '../components/templates/TemplateTestSendDialog';
import { TemplateVersionHistory } from '../components/templates/TemplateVersionHistory';
import { ChannelBadge } from '../components/templates/ChannelBadge';
import type { NotificationTemplate } from '../api/communicationApi';

// ── Inline Test Form ─────────────────────────────────────────────────────────

function TestInlineForm({ templateId, channel }: { templateId: number; channel: string }) {
  const [recipient, setRecipient] = useState('');
  const [result, setResult] = useState<{ success: boolean; subject: string; body: string } | null>(null);

  const sendMut = useMutation({
    mutationFn: () => notificationApi.testTemplate(templateId, recipient),
    onSuccess: (data) => { toast.success(`Test sent to ${recipient}`); setResult(data); },
    onError: () => toast.error('Failed to send test'),
  });

  const placeholder = channel === 'SMS' || channel === 'PUSH' ? '+234XXXXXXXXXX' : 'test@example.com';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Recipient</label>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={placeholder} className={inputCls} />
        <p className="text-xs text-muted-foreground mt-1">Template will be rendered with sample data and sent to this address.</p>
      </div>
      <button onClick={() => sendMut.mutate()} disabled={!recipient || sendMut.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        <Send className="w-4 h-4" /> {sendMut.isPending ? 'Sending...' : 'Send Test'}
      </button>
      {result && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-4 h-4" /> Test delivered to {recipient}
          </div>
          {result.subject && <div><p className="text-xs text-muted-foreground">Subject:</p><p className="text-sm font-medium">{result.subject}</p></div>}
          <div><p className="text-xs text-muted-foreground">Body (rendered):</p><pre className="text-sm whitespace-pre-wrap bg-muted/20 rounded p-2 mt-1 max-h-40 overflow-y-auto">{result.body}</pre></div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = parseInt(id ?? '0', 10);

  const { data: template, isLoading, isError } = useNotificationTemplate(templateId);
  const updateMut = useUpdateTemplate();
  const publishMut = usePublishTemplate();
  const archiveMut = useArchiveTemplate();

  const [showTest, setShowTest] = useState(false);

  const handleSave = (data: Partial<NotificationTemplate>) => {
    updateMut.mutate(
      { id: templateId, data },
      { onSuccess: () => toast.success('Template saved'), onError: () => toast.error('Failed to save') },
    );
  };

  const handlePublish = (data: Partial<NotificationTemplate>) => {
    updateMut.mutate({ id: templateId, data }, {
      onSuccess: () => {
        publishMut.mutate(templateId, {
          onSuccess: () => toast.success('Template saved & published'),
          onError: () => toast.error('Failed to publish'),
        });
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/communications/templates" />
        <div className="page-container space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded-xl" />
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </>
    );
  }

  if (isError || !template) {
    return (
      <>
        <PageHeader title="Template Not Found" backTo="/communications/templates" />
        <div className="page-container">
          <div className="rounded-xl border p-12 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Template could not be loaded</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={template.templateName}
        subtitle={template.templateCode}
        backTo="/communications/templates"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTest(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              <Send className="w-4 h-4" /> Test Send
            </button>
            <RoleGuard roles="CBS_ADMIN">
              {template.isActive ? (
                <button
                  onClick={() => archiveMut.mutate(templateId, { onSuccess: () => toast.success('Archived') })}
                  disabled={archiveMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <Archive className="w-4 h-4" /> Archive
                </button>
              ) : (
                <button
                  onClick={() => publishMut.mutate(templateId, { onSuccess: () => toast.success('Published') })}
                  disabled={publishMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" /> Publish
                </button>
              )}
            </RoleGuard>
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Header badges */}
        <div className="flex items-center gap-2">
          <ChannelBadge channel={template.channel} />
          <StatusBadge status={template.isActive ? 'ACTIVE' : 'ARCHIVED'} />
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">v{template.version}</span>
          <span className="text-xs text-muted-foreground font-mono">{template.templateCode}</span>
        </div>

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          {
            id: 'editor',
            label: 'Editor',
            content: (
              <div className="p-6">
                <TemplateEditor
                  template={template}
                  onSave={handleSave}
                  onPublish={handlePublish}
                  isSaving={updateMut.isPending}
                />
              </div>
            ),
          },
          {
            id: 'preview',
            label: 'Preview',
            content: (
              <div className="p-6">
                <TemplatePreview templateId={template.id} channel={template.channel} />
              </div>
            ),
          },
          {
            id: 'test',
            label: 'Test',
            content: (
              <div className="p-6 max-w-md">
                <h3 className="font-semibold mb-4">Send Test Message</h3>
                <TestInlineForm templateId={template.id} channel={template.channel} />
              </div>
            ),
          },
          {
            id: 'history',
            label: 'Version History',
            content: (
              <div className="p-6">
                <TemplateVersionHistory
                  templateId={template.id}
                  currentVersion={template.version}
                  createdAt={template.createdAt}
                  updatedAt={template.updatedAt}
                  createdBy={template.createdBy}
                />
              </div>
            ),
          },
        ]} />
      </div>

      {showTest && (
        <TemplateTestSendDialog templateId={template.id} channel={template.channel} onClose={() => setShowTest(false)} />
      )}
    </>
  );
}
