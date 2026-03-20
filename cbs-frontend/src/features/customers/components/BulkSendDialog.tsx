import { useState } from 'react';
import { Send, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSendBulk } from '../../communications/hooks/useCommunications';
import type { NotificationChannel } from '../../communications/api/communicationApi';
import type { CustomerListItem } from '../types/customer';

const CHANNELS: { value: NotificationChannel; label: string; icon: string }[] = [
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'SMS', label: 'SMS', icon: '📱' },
  { value: 'PUSH', label: 'Push', icon: '🔔' },
  { value: 'IN_APP', label: 'In-App', icon: '📄' },
];

interface BulkSendDialogProps {
  customers: CustomerListItem[];
  onClose: () => void;
}

export function BulkSendDialog({ customers, onClose }: BulkSendDialogProps) {
  const sendBulk = useSendBulk();
  const [channel, setChannel] = useState<NotificationChannel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSend = () => {
    if (!body.trim()) { toast.error('Message body is required'); return; }
    const recipients = customers.map((c) => ({
      address: channel === 'SMS' ? (c.phone ?? '') : (c.email ?? ''),
      name: c.fullName,
      customerId: c.id,
    }));

    sendBulk.mutate({ channel, subject, body, eventType: 'BULK', recipients }, {
      onSuccess: (result) => {
        toast.success(`Sent: ${result.sent}, Failed: ${result.failed} of ${result.total}`);
        onClose();
      },
      onError: () => toast.error('Bulk send failed'),
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Send to {customers.length} Customers</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {customers.slice(0, 3).map((c) => c.fullName).join(', ')}
            {customers.length > 3 && ` and ${customers.length - 3} more`}
          </div>

          <div className="flex gap-2">
            {CHANNELS.map((ch) => (
              <button key={ch.value} onClick={() => setChannel(ch.value)} className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
                channel === ch.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>

          {(channel === 'EMAIL' || channel === 'IN_APP') && (
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={inputCls} />
          )}

          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Message body..." className={cn(inputCls, 'resize-none')} />

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSend} disabled={!body.trim() || sendBulk.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Send className="w-4 h-4" /> {sendBulk.isPending ? 'Sending...' : `Send to ${customers.length}`}
            </button>
          </div>

          {sendBulk.isPending && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">Processing bulk send...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
