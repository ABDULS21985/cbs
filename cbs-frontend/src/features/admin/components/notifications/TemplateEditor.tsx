import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, Save, Send, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MergeFieldToolbar } from './MergeFieldToolbar';
import { TemplatePreview } from './TemplatePreview';
import type { NotificationTemplate, TemplateVersion } from '../../api/notificationAdminApi';
import { getTemplateVersions } from '../../api/notificationAdminApi';

interface TemplateEditorProps {
  template?: NotificationTemplate;
  onSave: (data: Partial<NotificationTemplate>) => void;
  onPublish: (data: Partial<NotificationTemplate>) => void;
}

const CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'] as const;
const CATEGORIES = ['TRANSACTION', 'ACCOUNT', 'LOAN', 'CARD', 'SECURITY', 'MARKETING', 'SYSTEM'] as const;
const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'YO', label: 'Yoruba' },
  { value: 'HA', label: 'Hausa' },
  { value: 'IG', label: 'Igbo' },
] as const;

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors placeholder:text-muted-foreground';

const selectClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

export function TemplateEditor({ template, onSave, onPublish }: TemplateEditorProps) {
  const isNew = !template;

  const [code, setCode] = useState(template?.code ?? '');
  const [name, setName] = useState(template?.name ?? '');
  const [channel, setChannel] = useState<typeof CHANNELS[number]>(template?.channel ?? 'EMAIL');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>(template?.category ?? 'TRANSACTION');
  const [language, setLanguage] = useState<'EN' | 'YO' | 'HA' | 'IG'>(template?.language ?? 'EN');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');

  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Reset form when template changes
  useEffect(() => {
    setCode(template?.code ?? '');
    setName(template?.name ?? '');
    setChannel(template?.channel ?? 'EMAIL');
    setCategory(template?.category ?? 'TRANSACTION');
    setLanguage(template?.language ?? 'EN');
    setSubject(template?.subject ?? '');
    setBody(template?.body ?? '');
    setShowHistory(false);
    setVersions([]);
  }, [template?.id]);

  const getFormData = useCallback((): Partial<NotificationTemplate> => ({
    code,
    name,
    channel,
    category,
    language,
    subject: channel === 'EMAIL' ? subject : undefined,
    body,
  }), [code, name, channel, category, language, subject, body]);

  const insertAtCursor = useCallback((field: string) => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => prev + field);
      return;
    }
    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const newBody = body.slice(0, start) + field + body.slice(end);
    setBody(newBody);
    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      const pos = start + field.length;
      textarea.setSelectionRange(pos, pos);
      textarea.focus();
    });
  }, [body]);

  const handleLoadVersions = async () => {
    if (!template?.id) return;
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setLoadingVersions(true);
    try {
      const v = await getTemplateVersions(template.id);
      setVersions(v);
      setShowHistory(true);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(getFormData());
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish(getFormData());
    } finally {
      setPublishing(false);
    }
  };

  const smsCharCount = body.length;
  const smsParts = Math.ceil(smsCharCount / 160) || 1;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      {/* Meta fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Template Code</label>
          <input
            className={cn(inputClass, !isNew && 'bg-muted/50 cursor-not-allowed opacity-70')}
            value={code}
            onChange={(e) => isNew && setCode(e.target.value)}
            readOnly={!isNew}
            placeholder="e.g. TXN-DEBIT-SMS"
          />
        </div>
        <div>
          <label className={labelClass}>Template Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Debit Alert SMS"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Channel</label>
          <select
            className={selectClass}
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof CHANNELS[number])}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Language</label>
          <select
            className={selectClass}
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof LANGUAGES[number]['value'])}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Email Subject */}
      {channel === 'EMAIL' && (
        <div>
          <label className={labelClass}>Subject Line</label>
          <input
            ref={subjectRef}
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Debit Alert: {{currency}}{{amount}} from your account"
          />
        </div>
      )}

      {/* Body section with merge toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>
            {channel === 'EMAIL' ? 'Email Body' : channel === 'SMS' ? 'SMS Message' : channel === 'PUSH' ? 'Push Notification Body' : 'In-App Message Body'}
          </label>
          {channel === 'SMS' && (
            <span className={cn(
              'text-xs font-medium tabular-nums',
              smsCharCount > 160 ? 'text-destructive' : smsCharCount > 140 ? 'text-amber-500' : 'text-muted-foreground',
            )}>
              {smsCharCount} / 160
              {smsCharCount > 160 && ` (${smsParts} parts)`}
            </span>
          )}
        </div>

        <MergeFieldToolbar onInsert={insertAtCursor} />

        <textarea
          ref={bodyRef}
          className={cn(
            inputClass,
            'resize-none leading-6',
            channel === 'EMAIL' ? 'font-mono text-xs h-72' : channel === 'SMS' ? 'h-28' : 'h-32',
          )}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            channel === 'EMAIL'
              ? 'Dear {{customerName}},\n\nYour account {{accountNumber}} has been...'
              : channel === 'SMS'
              ? '{{bankName}}: Your account {{accountNumber}} has been debited...'
              : channel === 'PUSH'
              ? 'New login detected on {{transactionDate}}...'
              : 'Your account requires attention...'
          }
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {/* Version History */}
      {template && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={handleLoadVersions}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Version History</span>
              <span className="text-xs text-muted-foreground">(v{template.version})</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-border divide-y divide-border">
              {loadingVersions && (
                <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">Loading versions...</div>
              )}
              {!loadingVersions && versions.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">No version history available.</div>
              )}
              {versions.map((v) => (
                <div key={v.version} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">{v.editedBy}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.editedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {v.changeNote && (
                    <p className="text-xs text-muted-foreground pl-6">{v.changeNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <TemplatePreview
          template={{ ...getFormData() }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
