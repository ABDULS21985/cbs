import { useState } from 'react';
import { Send, Clock } from 'lucide-react';
import { FormSection } from '@/components/shared/FormSection';
import type { Communication } from '../api/communicationApi';

interface Props {
  customerId: number;
  customerName: string;
  onSend: (data: Partial<Communication>) => void;
  onSchedule: (data: Partial<Communication> & { scheduledAt: string }) => void;
  isSending?: boolean;
}

export function ComposeMessageForm({ customerId, customerName, onSend, onSchedule, isSending }: Props) {
  const [channel, setChannel] = useState<Communication['channel']>('EMAIL');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const mergeFields = ['{{customerName}}', '{{accountNumber}}', '{{amount}}', '{{date}}'];

  const insertMergeField = (field: string) => {
    setContent((prev) => prev + field);
  };

  const handleSend = () => {
    const data: Partial<Communication> = { customerId, customerName, channel, subject, messageContent: content, messagePreview: content.slice(0, 100) };
    if (showSchedule && scheduleDate) {
      onSchedule({ ...data, scheduledAt: scheduleDate });
    } else {
      onSend(data);
    }
  };

  return (
    <FormSection title="Compose Message">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['EMAIL', 'SMS', 'PUSH', 'LETTER'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${channel === ch ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {ch}
            </button>
          ))}
        </div>

        {channel === 'EMAIL' && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Email subject" />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <div className="flex gap-1">
              {mergeFields.map((field) => (
                <button key={field} type="button" onClick={() => insertMergeField(field)} className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80 font-mono">
                  {field}
                </button>
              ))}
            </div>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Type your message..." />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showSchedule} onChange={(e) => setShowSchedule(e.target.checked)} className="rounded" />
            Schedule for later
          </label>
          {showSchedule && (
            <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleSend} disabled={!content.trim() || isSending} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {showSchedule ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {isSending ? 'Sending...' : showSchedule ? 'Schedule' : 'Send'}
          </button>
        </div>
      </div>
    </FormSection>
  );
}
