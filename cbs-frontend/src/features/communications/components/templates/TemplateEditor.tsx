import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MergeFieldToolbar } from './MergeFieldToolbar';
import type { NotificationTemplate, NotificationChannel } from '../../api/communicationApi';

const CHANNELS: { value: NotificationChannel; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'PUSH', label: 'Push' },
  { value: 'IN_APP', label: 'In-App' },
];

const EVENT_TYPES = ['ACCOUNT', 'TRANSACTION', 'SECURITY', 'MARKETING', 'PRODUCT', 'COMPLIANCE', 'LOAN', 'CARD', 'SYSTEM'];

function generateCode(name: string): string {
  return name.trim().toUpperCase().split(/\s+/).slice(0, 3).map(w => w.slice(0, 4)).join('-') || 'TPL';
}

interface TemplateEditorProps {
  template?: Partial<NotificationTemplate>;
  isNew?: boolean;
  onSave: (data: Partial<NotificationTemplate>) => void;
  onPublish?: (data: Partial<NotificationTemplate>) => void;
  isSaving?: boolean;
}

export function TemplateEditor({ template, isNew, onSave, onPublish, isSaving }: TemplateEditorProps) {
  const [form, setForm] = useState<Partial<NotificationTemplate>>({
    templateCode: template?.templateCode ?? '',
    templateName: template?.templateName ?? '',
    channel: template?.channel ?? 'EMAIL',
    eventType: template?.eventType ?? 'ACCOUNT',
    subject: template?.subject ?? '',
    bodyTemplate: template?.bodyTemplate ?? '',
    isHtml: template?.isHtml ?? true,
    locale: template?.locale ?? 'en_NG',
  });

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [dirty, setDirty] = useState(false);

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'templateName' && isNew && !prev.templateCode) {
        next.templateCode = generateCode(value as string);
      }
      return next;
    });
    setDirty(true);
  };

  const insertMergeField = useCallback((field: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setForm(prev => ({ ...prev, bodyTemplate: (prev.bodyTemplate ?? '') + field }));
      setDirty(true);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.bodyTemplate ?? '';
    const newText = text.slice(0, start) + field + text.slice(end);
    setForm(prev => ({ ...prev, bodyTemplate: newText }));
    setDirty(true);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + field.length, start + field.length);
    }, 0);
  }, [form.bodyTemplate]);

  const handleSave = () => { onSave(form); setDirty(false); };
  const handlePublish = () => { onPublish?.(form); setDirty(false); };

  // SMS character counter
  const smsLength = (form.bodyTemplate ?? '').length;
  const smsSegments = Math.ceil(smsLength / 160) || 1;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

  return (
    <div className="space-y-5">
      {/* Code + Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Template Code</label>
          <input
            value={form.templateCode ?? ''}
            onChange={(e) => updateField('templateCode', e.target.value.toUpperCase())}
            readOnly={!isNew}
            className={cn(inputCls, 'font-mono', !isNew && 'bg-muted cursor-not-allowed')}
            placeholder="ACC-STMT-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <input value={form.templateName ?? ''} onChange={(e) => updateField('templateName', e.target.value)} className={inputCls} placeholder="Account Statement Notification" />
        </div>
      </div>

      {/* Channel + Event Type + Locale + HTML */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Channel</label>
          <select value={form.channel ?? 'EMAIL'} onChange={(e) => {
            const ch = e.target.value as NotificationChannel;
            updateField('channel', ch);
            if (ch === 'SMS' || ch === 'PUSH') updateField('isHtml', false);
            else updateField('isHtml', true);
          }} className={inputCls}>
            {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Event Type</label>
          <select value={form.eventType ?? 'ACCOUNT'} onChange={(e) => updateField('eventType', e.target.value)} className={inputCls}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Locale</label>
          <select value={form.locale ?? 'en_NG'} onChange={(e) => updateField('locale', e.target.value)} className={inputCls}>
            <option value="en_NG">en_NG</option>
            <option value="en_US">en_US</option>
            <option value="fr_FR">fr_FR</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pb-2">
            <input type="checkbox" checked={form.isHtml ?? false} onChange={(e) => updateField('isHtml', e.target.checked)} className="accent-primary" disabled={form.channel === 'SMS' || form.channel === 'PUSH'} />
            HTML Template
          </label>
        </div>
      </div>

      {/* Subject (email only) */}
      {(form.channel === 'EMAIL' || form.channel === 'IN_APP') && (
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input value={form.subject ?? ''} onChange={(e) => updateField('subject', e.target.value)} className={inputCls} placeholder="Your {{accountType}} Account Statement - {{date}}" />
        </div>
      )}

      {/* Merge Fields */}
      <MergeFieldToolbar onInsert={insertMergeField} />

      {/* Body Editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Body Template</label>
          {form.channel === 'SMS' && (
            <span className={cn('text-xs font-mono', smsLength > 160 ? 'text-amber-600' : 'text-muted-foreground')}>
              {smsLength}/160 chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
              {smsSegments > 1 && <span className="text-amber-600 ml-1">— will be sent as {smsSegments} SMS segments</span>}
            </span>
          )}
          {form.channel === 'PUSH' && (
            <span className={cn('text-xs font-mono', (form.bodyTemplate?.length ?? 0) > 200 ? 'text-red-600' : 'text-muted-foreground')}>
              {form.bodyTemplate?.length ?? 0}/200 chars
            </span>
          )}
        </div>
        <textarea
          ref={bodyRef}
          value={form.bodyTemplate ?? ''}
          onChange={(e) => updateField('bodyTemplate', e.target.value)}
          rows={form.channel === 'SMS' ? 4 : form.channel === 'PUSH' ? 3 : 12}
          maxLength={form.channel === 'PUSH' ? 200 : undefined}
          placeholder={
            form.channel === 'SMS' ? 'Dear {{customerName}}, your account {{accountNumber}} has been...' :
            form.channel === 'PUSH' ? 'Your account balance is ₦{{amount}}' :
            'Dear {{customerName}},\n\nYour statement for account {{accountNumber}}...'
          }
          className={cn(inputCls, 'font-mono text-sm resize-none')}
        />
      </div>

      {/* Version info */}
      {template?.version && (
        <p className="text-xs text-muted-foreground">
          v{template.version} · Last edited {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : '—'}
          {template.createdBy && ` by ${template.createdBy}`}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
        {!dirty && <span />}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          {onPublish && (
            <button onClick={handlePublish} disabled={isSaving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
              Save & Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
