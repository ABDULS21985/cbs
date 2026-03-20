import { useState } from 'react';
import { Send, Clock, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChannelSelector } from './ChannelSelector';
import { RecipientSearch } from './RecipientSearch';
import { useSendNotification, useNotificationTemplates } from '../hooks/useCommunications';
import type { NotificationChannel } from '../api/communicationApi';

const MERGE_FIELDS = ['{{customerName}}', '{{accountNumber}}', '{{amount}}', '{{date}}', '{{branchName}}'];

interface ComposeMessageFormProps {
  open: boolean;
  onClose: () => void;
}

export function ComposeMessageForm({ open, onClose }: ComposeMessageFormProps) {
  const [channel, setChannel] = useState<NotificationChannel>('EMAIL');
  const [recipient, setRecipient] = useState({ name: '', address: '' });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [eventType, setEventType] = useState('GENERAL');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const { data: templates = [] } = useNotificationTemplates();
  const sendMutation = useSendNotification();

  const smsCharCount = body.length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  const insertMergeField = (field: string) => {
    setBody((prev) => prev + field);
  };

  const handleTemplateSelect = (id: number) => {
    setSelectedTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setChannel(template.channel);
      if (template.subject) setSubject(template.subject);
      setBody(template.bodyTemplate);
      setEventType(template.eventType);
    }
  };

  const handleSend = () => {
    if (!recipient.address) {
      toast.error('Please specify a recipient');
      return;
    }

    const isEmail = channel === 'EMAIL' || recipient.address.includes('@');
    const params = {
      eventType,
      email: isEmail ? recipient.address : undefined,
      phone: !isEmail ? recipient.address : undefined,
      name: recipient.name || undefined,
    };

    sendMutation.mutate(
      { params, body: { subject, body, channel } },
      {
        onSuccess: () => {
          toast.success(`Message sent to ${recipient.address}`);
          setBody('');
          setSubject('');
          setRecipient({ name: '', address: '' });
          onClose();
        },
        onError: () => toast.error('Failed to send message'),
      },
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[500px] bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold">Compose Message</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Channel */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">Channel</label>
            <ChannelSelector value={channel} onChange={setChannel} />
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">To</label>
            <RecipientSearch onSelect={setRecipient} />
          </div>

          {/* Template */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">Template (optional)</label>
            <select value={selectedTemplateId ?? ''} onChange={(e) => handleTemplateSelect(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">No template</option>
              {templates.filter((t) => t.isActive && t.channel === channel).map((t) => (
                <option key={t.id} value={t.id}>{t.templateName}</option>
              ))}
            </select>
          </div>

          {/* Subject (email only) */}
          {channel === 'EMAIL' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}

          {/* Merge Fields */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide">Merge Fields</label>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_FIELDS.map((field) => (
                <button key={field} type="button" onClick={() => insertMergeField(field)}
                  className="px-2 py-1 rounded bg-muted text-[10px] font-mono text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors">
                  {field}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide">Body</label>
              {channel === 'SMS' && (
                <span className={cn('text-[10px] tabular-nums', smsCharCount > 160 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {smsCharCount}/160 ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              rows={channel === 'SMS' ? 4 : 8}
              placeholder={channel === 'SMS' ? 'SMS message (160 chars per segment)' : 'Message body…'}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono" />
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="rounded" />
              Schedule for later
            </label>
            {scheduleEnabled && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            )}
          </div>

          {/* Preview Toggle */}
          {body && (
            <div>
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              {showPreview && (
                <div className="mt-2 rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {body.replace(/\{\{customerName\}\}/g, 'John Doe')
                    .replace(/\{\{accountNumber\}\}/g, '0012345678')
                    .replace(/\{\{amount\}\}/g, '₦150,000.00')
                    .replace(/\{\{date\}\}/g, '20 Mar 2026')
                    .replace(/\{\{branchName\}\}/g, 'Victoria Island')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-background border-t px-5 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={handleSend} disabled={sendMutation.isPending || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {sendMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {scheduleEnabled ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {scheduleEnabled ? 'Schedule' : 'Send Now'}
          </button>
        </div>
      </div>
    </>
  );
}
