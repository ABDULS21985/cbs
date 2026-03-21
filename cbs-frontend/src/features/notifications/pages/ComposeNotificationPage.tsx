import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, Bell, Smartphone, Send, Clock, Loader2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { useSendNotification, useSendDirect, useSendBulk } from '../hooks/useNotificationsExt';
import { RecipientSelector, type RecipientSelection } from '../components/RecipientSelector';
import { TemplateSelector } from '../components/TemplateSelector';
import { NotificationPreviewCard } from '../components/NotificationPreviewCard';
import { ScheduleConfig, type ScheduleResult } from '../components/ScheduleConfig';
import { createScheduledNotification } from '@/features/admin/api/notificationAdminApi';
import type { NotificationTemplate, NotificationChannel } from '../types/notificationExt';

// ── Channel config ───────────────────────────────────────────────────────────

const CHANNELS: { id: NotificationChannel; label: string; icon: typeof Mail; color: string; bg: string }[] = [
  { id: 'EMAIL', label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'SMS', label: 'SMS', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'PUSH', label: 'Push', icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'IN_APP', label: 'In-App', icon: Smartphone, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'WEBHOOK', label: 'Webhook', icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
];

// ── Section component ────────────────────────────────────────────────────────

function Section({ number, title, description, children, defaultOpen = true }: {
  number: number; title: string; description: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{number}</span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 border-t pt-4">{children}</div>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ComposeNotificationPage() {
  const navigate = useNavigate();
  const sendMut = useSendNotification();

  useEffect(() => { document.title = 'Compose Notification | CBS'; }, []);

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [channel, setChannel] = useState('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [eventType, setEventType] = useState('CUSTOM_NOTIFICATION');
  const [recipients, setRecipients] = useState<RecipientSelection>({ mode: 'individual' });
  const [schedule, setSchedule] = useState<ScheduleResult>({ mode: 'now' });
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  // When template is selected, auto-fill fields
  useEffect(() => {
    if (selectedTemplate) {
      setChannel(selectedTemplate.channel);
      setSubject(selectedTemplate.subject ?? '');
      setBody(selectedTemplate.bodyTemplate ?? '');
      setEventType(selectedTemplate.eventType ?? 'CUSTOM_NOTIFICATION');
      setUseCustom(false);
    }
  }, [selectedTemplate]);

  // Validation
  const hasRecipients = recipients.mode === 'broadcast' ? recipients.isBroadcast :
    recipients.mode === 'segment' ? !!recipients.segmentCode :
    (recipients.customerIds?.length ?? 0) > 0;
  const hasContent = !!body;
  const canSend = hasRecipients && hasContent;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      if (schedule.mode === 'now') {
        // Send to each recipient via existing API
        if (recipients.mode === 'individual' && recipients.customerIds) {
          for (const customerId of recipients.customerIds) {
            await sendMut.mutateAsync({
              eventType,
              customerId,
              extraParams: { subject, body, channel },
            });
          }
          toast.success(`Notification sent to ${recipients.customerIds.length} recipient(s)`);
        } else if (recipients.mode === 'segment' || recipients.mode === 'broadcast') {
          // For segment/broadcast, send via the admin API with broader params
          await sendMut.mutateAsync({
            eventType,
            customerId: 0, // Backend interprets 0 as broadcast/segment
            extraParams: {
              subject, body, channel,
              ...(recipients.segmentCode ? { segmentCode: recipients.segmentCode } : {}),
              ...(recipients.isBroadcast ? { broadcast: 'true' } : {}),
            },
          });
          toast.success('Broadcast notification sent');
        }
      } else {
        // Create scheduled notification
        await createScheduledNotification({
          name: subject || eventType,
          templateCode: selectedTemplate?.code ?? undefined,
          channel,
          cronExpression: schedule.cronExpression,
          frequency: schedule.frequency ?? 'ONCE',
          recipientCriteria: {
            mode: recipients.mode,
            customerIds: recipients.customerIds,
            segmentCode: recipients.segmentCode,
            isBroadcast: recipients.isBroadcast,
          },
        });
        toast.success(schedule.mode === 'once' ? 'Notification scheduled' : 'Recurring notification created');
      }
      navigate('/notifications');
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const recipientCount = recipients.mode === 'individual' ? (recipients.customerIds?.length ?? 0) :
    recipients.mode === 'segment' ? (recipients.estimatedCount ?? 0) : 'All';

  return (
    <>
      <PageHeader title="Compose Notification" subtitle="Send targeted or broadcast notifications" backTo="/notifications" />

      <div className="page-container space-y-4 max-w-3xl">
        {/* Section 1: Template & Channel */}
        <Section number={1} title="Template & Channel" description="Choose a template or compose a custom message">
          <div className="space-y-4">
            {/* Custom toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={useCustom} onChange={(e) => { setUseCustom(e.target.checked); if (e.target.checked) setSelectedTemplate(null); }}
                className="rounded" />
              Custom message (no template)
            </label>

            {!useCustom && (
              <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />
            )}

            {/* Channel selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Channel</label>
              <div className="flex gap-2">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button key={ch.id} onClick={() => setChannel(ch.id)}
                      className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all',
                        channel === ch.id ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-muted')}>
                      <Icon className={cn('w-4 h-4', channel === ch.id ? ch.color : 'text-muted-foreground')} />
                      <span className="text-sm font-medium">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Section 2: Recipients */}
        <Section number={2} title="Recipients" description="Choose who receives this notification">
          <RecipientSelector value={recipients} onChange={setRecipients} />
        </Section>

        {/* Section 3: Message Content */}
        <Section number={3} title="Message Content" description="Compose or edit the notification content">
          <div className="space-y-3">
            {channel === 'EMAIL' && (
              <div><label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={cn(fc, 'mt-1')} placeholder="Notification subject..." /></div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                {channel === 'SMS' && <span className={cn('text-[10px]', body.length > 160 ? 'text-amber-600' : 'text-muted-foreground')}>{body.length}/160</span>}
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className={cn(fc, 'mt-1')} placeholder="Type your message..." />
            </div>

            {/* Merge field hints */}
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-muted-foreground mr-1">Insert:</span>
              {['{{customerName}}', '{{accountNumber}}', '{{amount}}', '{{date}}'].map((field) => (
                <button key={field} onClick={() => setBody((b) => b + field)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-mono hover:bg-yellow-200">
                  {field}
                </button>
              ))}
            </div>

            {/* Preview toggle */}
            <button onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? 'Hide' : 'Show'} preview
            </button>

            {showPreview && (
              <div className="mt-2 p-4 rounded-lg bg-muted/30 border">
                <NotificationPreviewCard channel={channel} subject={subject} body={body} recipientName={recipients.customerNames?.[recipients.customerIds?.[0] ?? 0] ?? 'Customer'} />
              </div>
            )}
          </div>
        </Section>

        {/* Section 4: Schedule */}
        <Section number={4} title="Schedule" description="Send now or schedule for later" defaultOpen={false}>
          <ScheduleConfig value={schedule} onChange={setSchedule} />
        </Section>

        {/* Section 5: Review & Send */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">5</span>
            <h3 className="text-sm font-semibold">Review & Send</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Channel</p>
              <p className="font-medium">{channel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recipients</p>
              <p className="font-medium">{recipientCount} {typeof recipientCount === 'number' ? `recipient${recipientCount !== 1 ? 's' : ''}` : 'active customers'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Schedule</p>
              <p className="font-medium">{schedule.mode === 'now' ? 'Immediate' : schedule.mode === 'once' ? 'Scheduled' : 'Recurring'}</p>
            </div>
          </div>

          {selectedTemplate && (
            <div className="text-xs text-muted-foreground">
              Template: <span className="font-mono font-medium">{selectedTemplate.code}</span>
            </div>
          )}

          {!canSend && (
            <p className="text-xs text-amber-600">
              {!hasRecipients ? 'Please select at least one recipient.' : 'Please enter message content.'}
            </p>
          )}

          <div className="flex gap-3 pt-2 border-t">
            <button onClick={() => navigate('/notifications')} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button onClick={handleSend} disabled={!canSend || sending}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : schedule.mode === 'now' ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {schedule.mode === 'now' ? 'Send Now' : 'Schedule'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
