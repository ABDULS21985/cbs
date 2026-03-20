import { useState, useRef, useCallback } from 'react';
import { Save, Send, Loader2, Eye, EyeOff, History, FlaskConical, Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationTemplate, NotificationChannel } from '../../api/notificationAdminApi';
import { MergeFieldToolbar } from './MergeFieldToolbar';

interface TemplateEditorProps {
  template?: NotificationTemplate;
  onSave: (data: Partial<NotificationTemplate>) => Promise<void>;
  onPublish: (data: Partial<NotificationTemplate>) => Promise<void>;
  onTestSend?: () => void;
  onVersionHistory?: () => void;
  fullWidth?: boolean;
}

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'];

const SAMPLE_DATA: Record<string, string> = {
  customerName: 'Amara Okonkwo',
  accountNumber: '012 345 6789',
  email: 'amara@example.com',
  phone: '+2348012345678',
  amount: '₦150,000.00',
  date: '20 Mar 2026',
  reference: 'TXN-20260320-0001',
  balance: '₦1,250,000.00',
  branchName: 'Lagos Main',
  bankName: 'BellBank',
  supportPhone: '+234-1-234-5678',
};

function renderPreview(body: string, isHtml: boolean, sampleData: Record<string, string>): string {
  let rendered = body;
  Object.entries(sampleData).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  return isHtml ? rendered : rendered.replace(/\n/g, '<br/>');
}

export function TemplateEditor({ template, onSave, onPublish, onTestSend, onVersionHistory, fullWidth }: TemplateEditorProps) {
  const [templateCode, setTemplateCode] = useState(template?.templateCode || '');
  const [templateName, setTemplateName] = useState(template?.templateName || '');
  const [channel, setChannel] = useState<NotificationChannel>(template?.channel || 'EMAIL');
  const [eventType, setEventType] = useState(template?.eventType || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.bodyTemplate || '');
  const [isHtml, setIsHtml] = useState(template?.isHtml ?? false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [useSampleData, setUseSampleData] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const smsCharCount = channel === 'SMS' ? body.length : 0;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  const insertField = useCallback((field: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = body.substring(0, start) + `{{${field}}}` + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      ta.focus();
      const pos = start + field.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [body]);

  const getData = (): Partial<NotificationTemplate> => ({
    templateCode,
    templateName,
    channel,
    eventType,
    subject: channel === 'EMAIL' ? subject : undefined,
    bodyTemplate: body,
    isHtml,
  });

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(getData()); } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try { await onPublish(getData()); } finally { setPublishing(false); }
  };

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';
  const previewHtml = renderPreview(body, isHtml || channel === 'EMAIL', useSampleData ? SAMPLE_DATA : {});
  const previewSubject = renderPreview(subject, false, useSampleData ? SAMPLE_DATA : {});

  return (
    <div className={cn('flex gap-4', fullWidth ? 'flex-col lg:flex-row' : 'flex-col')}>
      {/* Editor panel */}
      <div className={cn('space-y-4', fullWidth ? 'flex-1 min-w-0' : '')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Template Code</label>
            <input value={templateCode} onChange={e => setTemplateCode(e.target.value)}
              disabled={!!template}
              placeholder="e.g. TXN_CREDIT_ALERT"
              className={cn(fc, 'font-mono', template && 'opacity-60 cursor-not-allowed bg-muted')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Template Name</label>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Credit Alert" className={fc} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value as NotificationChannel)} className={fc}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Event Type</label>
            <input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. ACCOUNT_CREDIT" className={fc} />
          </div>
        </div>

        {channel === 'EMAIL' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your account has been credited" className={fc} />
          </div>
        )}

        {channel === 'EMAIL' && (
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" checked={isHtml} onChange={e => setIsHtml(e.target.checked)} className="rounded" />
            <span>HTML template</span>
          </label>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Body Template</label>
            {channel === 'SMS' && (
              <span className={cn('text-xs', smsCharCount > 160 ? 'text-amber-600' : 'text-muted-foreground')}>
                {smsCharCount}/160 chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <MergeFieldToolbar onInsert={insertField} />
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={channel === 'SMS' ? 4 : 8}
            placeholder={channel === 'EMAIL' ? '<p>Dear {{customerName}},</p>' : 'Dear {{customerName}}, your account {{accountNumber}} has been credited...'}
            className={cn(fc, 'font-mono text-xs resize-y')}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          <button onClick={handleSave} disabled={saving || publishing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button onClick={handlePublish} disabled={saving || publishing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
          {onTestSend && (
            <button onClick={onTestSend}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <FlaskConical className="w-4 h-4" /> Test Send
            </button>
          )}
          {onVersionHistory && (
            <button onClick={onVersionHistory}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              <History className="w-4 h-4" /> Versions
            </button>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {(fullWidth || showPreview) && (
        <div className={cn('rounded-lg border bg-muted/20', fullWidth ? 'w-[400px] shrink-0 sticky top-4' : '')}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Live Preview</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setUseSampleData(!useSampleData)} title="Toggle sample data"
                className={cn('p-1.5 rounded text-xs', useSampleData ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                {useSampleData ? 'Sample' : 'Raw'}
              </button>
              <button onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}
                className="p-1.5 rounded text-muted-foreground hover:bg-muted">
                {previewDevice === 'desktop' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              </button>
              {!fullWidth && (
                <button onClick={() => setShowPreview(false)} className="p-1.5 rounded text-muted-foreground hover:bg-muted">
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className={cn('p-4', previewDevice === 'mobile' ? 'max-w-[320px] mx-auto' : '')}>
            {/* Channel-specific preview */}
            {channel === 'EMAIL' ? (
              <div className="rounded-lg border bg-white dark:bg-background overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-[10px] text-muted-foreground">From: noreply@bellbank.com</p>
                  <p className="text-xs font-medium mt-0.5">{previewSubject || '(No subject)'}</p>
                </div>
                <div className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none text-xs"
                  dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted-foreground">(Empty body)</p>' }} />
              </div>
            ) : channel === 'SMS' ? (
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 max-w-[260px]">
                <p className="text-xs whitespace-pre-wrap">{useSampleData ? renderPreview(body, false, SAMPLE_DATA) : body || '(Empty)'}</p>
                <p className="text-[10px] text-muted-foreground mt-2 text-right">{smsCharCount} chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}</p>
              </div>
            ) : channel === 'PUSH' ? (
              <div className="rounded-xl border bg-white dark:bg-background shadow-sm p-3 max-w-[300px]">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">BB</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">BellBank</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {useSampleData ? renderPreview(body, false, SAMPLE_DATA) : body || '(Empty)'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Just now</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-white dark:bg-background p-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{templateName || 'Notification'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                      {useSampleData ? renderPreview(body, false, SAMPLE_DATA) : body || '(Empty)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview toggle when hidden */}
      {!fullWidth && !showPreview && (
        <button onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Eye className="w-3.5 h-3.5" /> Show preview
        </button>
      )}
    </div>
  );
}
