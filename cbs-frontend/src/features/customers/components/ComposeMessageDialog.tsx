import { useState, useRef, useMemo } from 'react';
import { Send, X, Clock, Eye, EyeOff, Smartphone, Mail, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSendDirect, useNotificationTemplates } from '../../communications/hooks/useCommunications';
import type { NotificationChannel, NotificationTemplate } from '../../communications/api/communicationApi';
import type { Customer } from '../types/customer';

const CHANNELS: { value: NotificationChannel; label: string; icon: string }[] = [
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'SMS', label: 'SMS', icon: '📱' },
  { value: 'PUSH', label: 'Push', icon: '🔔' },
  { value: 'IN_APP', label: 'In-App', icon: '📄' },
];

const MERGE_FIELDS = [
  { key: '{{customerName}}', label: 'Customer Name' },
  { key: '{{accountNumber}}', label: 'Account #' },
  { key: '{{balance}}', label: 'Balance' },
  { key: '{{date}}', label: 'Date' },
  { key: '{{branchName}}', label: 'Branch' },
];

interface ComposeMessageDialogProps {
  customer: Customer;
  onClose: () => void;
}

export function ComposeMessageDialog({ customer, onClose }: ComposeMessageDialogProps) {
  const sendDirect = useSendDirect();
  const { data: templates = [] } = useNotificationTemplates();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [channel, setChannel] = useState<NotificationChannel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'email' | 'web' | null>(null);

  const recipientAddress = channel === 'SMS' ? (customer.phone ?? '') : (customer.email ?? '');

  const channelTemplates = useMemo(() =>
    templates.filter((t: NotificationTemplate) => t.channel === channel && t.isActive),
    [templates, channel],
  );

  const handleTemplateSelect = (templateId: number) => {
    const tmpl = templates.find((t: NotificationTemplate) => t.id === templateId);
    if (tmpl) {
      setSelectedTemplateId(templateId);
      setSubject(tmpl.subject ?? '');
      setBody(tmpl.bodyTemplate);
    }
  };

  const insertMergeField = (field: string) => {
    const textarea = bodyRef.current;
    if (!textarea) { setBody((prev) => prev + field); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = body.slice(0, start) + field + body.slice(end);
    setBody(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + field.length, start + field.length); }, 0);
  };

  const resolveBody = (text: string) =>
    text
      .replace(/\{\{customerName\}\}/g, customer.fullName)
      .replace(/\{\{accountNumber\}\}/g, customer.customerNumber)
      .replace(/\{\{balance\}\}/g, '₦0.00')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{branchName\}\}/g, customer.branchCode ?? 'Main Branch');

  const handleSend = () => {
    if (!body.trim()) { toast.error('Message body is required'); return; }
    sendDirect.mutate({
      channel,
      recipientAddress,
      recipientName: customer.fullName,
      subject: resolveBody(subject),
      body: resolveBody(body),
      customerId: customer.id,
      eventType: 'DIRECT',
    }, {
      onSuccess: () => { toast.success(`Message sent to ${customer.fullName}`); onClose(); },
      onError: () => toast.error('Failed to send message'),
    });
  };

  const smsLength = body.length;
  const smsSegments = Math.ceil(smsLength / 160) || 1;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Contact Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Recipient */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{customer.fullName}</p>
              <p className="text-xs text-muted-foreground font-mono">{customer.customerNumber}</p>
            </div>
            <p className="text-xs text-muted-foreground">{recipientAddress || 'No address'}</p>
          </div>

          {/* Channel selector */}
          <div className="flex gap-2">
            {CHANNELS.map((ch) => (
              <button key={ch.value} onClick={() => setChannel(ch.value)} className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                channel === ch.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}>
                <span>{ch.icon}</span> {ch.label}
              </button>
            ))}
          </div>

          {/* Template selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedTemplateId ?? ''}
              onChange={(e) => e.target.value ? handleTemplateSelect(Number(e.target.value)) : setSelectedTemplateId(null)}
              className={cn(inputCls, 'flex-1')}
            >
              <option value="">Custom Message</option>
              {channelTemplates.map((t: NotificationTemplate) => <option key={t.id} value={t.id}>{t.templateName}</option>)}
            </select>
          </div>

          {/* Subject (email/in-app only) */}
          {(channel === 'EMAIL' || channel === 'IN_APP') && (
            <div>
              <label className="block text-xs font-medium mb-1">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject" className={inputCls} />
            </div>
          )}

          {/* Merge fields */}
          <div className="flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map((f) => (
              <button key={f.key} type="button" onClick={() => insertMergeField(f.key)}
                className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20">
                {f.key}
              </button>
            ))}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium">Message</label>
              {channel === 'SMS' && (
                <span className={cn('text-xs font-mono', smsLength > 160 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {smsLength}/160 · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={channel === 'SMS' ? 4 : 8}
              placeholder="Type your message..."
              className={cn(inputCls, 'font-mono text-sm resize-none')}
            />
          </div>

          {/* Preview toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview:</span>
            {[
              { key: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
              { key: 'email' as const, icon: Mail, label: 'Email' },
              { key: 'web' as const, icon: Monitor, label: 'Web' },
            ].map((p) => (
              <button key={p.key} onClick={() => setPreviewMode(previewMode === p.key ? null : p.key)}
                className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  previewMode === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                <p.icon className="w-3 h-3" /> {p.label}
              </button>
            ))}
          </div>

          {/* Preview render */}
          {previewMode && (
            <div className={cn('rounded-lg border bg-muted/20 p-4', previewMode === 'mobile' ? 'max-w-xs mx-auto' : '')}>
              {subject && <p className="text-sm font-medium mb-2">{resolveBody(subject)}</p>}
              <div className="text-sm whitespace-pre-wrap">{resolveBody(body)}</div>
            </div>
          )}

          {/* Schedule */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="accent-primary" />
              Schedule for later
            </label>
            {scheduleEnabled && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={cn(inputCls, 'w-auto')} />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSend} disabled={!body.trim() || sendDirect.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Send className="w-4 h-4" /> {sendDirect.isPending ? 'Sending...' : scheduleEnabled ? 'Schedule' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
