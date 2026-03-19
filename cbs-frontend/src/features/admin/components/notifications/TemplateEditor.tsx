import { useState, useRef, useCallback } from 'react';
import { Save, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationTemplate, NotificationChannel } from '../../api/notificationAdminApi';
import { MergeFieldToolbar } from './MergeFieldToolbar';

interface TemplateEditorProps {
  template?: NotificationTemplate;
  onSave: (data: Partial<NotificationTemplate>) => Promise<void>;
  onPublish: (data: Partial<NotificationTemplate>) => Promise<void>;
}

const CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'];

export function TemplateEditor({ template, onSave, onPublish }: TemplateEditorProps) {
  const [templateCode, setTemplateCode] = useState(template?.templateCode || '');
  const [templateName, setTemplateName] = useState(template?.templateName || '');
  const [channel, setChannel] = useState<NotificationChannel>(template?.channel || 'EMAIL');
  const [eventType, setEventType] = useState(template?.eventType || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.bodyTemplate || '');
  const [isHtml, setIsHtml] = useState(template?.isHtml ?? false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Template Code</label>
          <input value={templateCode} onChange={e => setTemplateCode(e.target.value)} placeholder="e.g. TXN_CREDIT_ALERT" className={cn(fc, 'font-mono')} />
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

      <div className="flex gap-2 pt-3 border-t">
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
      </div>
    </div>
  );
}
