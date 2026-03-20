import { Mail, MessageSquare, Bell, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  channel: string;
  subject?: string;
  body: string;
  recipientName?: string;
}

export function NotificationPreviewCard({ channel, subject, body, recipientName }: Props) {
  // Highlight merge fields in body
  const highlightedBody = body.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-1 rounded text-xs font-mono">{{$1}}</span>',
  );

  if (channel === 'EMAIL') {
    return (
      <div className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden max-w-md">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium">Email Preview</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">From: noreply@bellbank.com</p>
          {recipientName && <p className="text-[10px] text-muted-foreground">To: {recipientName}</p>}
        </div>
        {subject && <div className="px-4 py-2 border-b"><p className="text-sm font-semibold">{subject}</p></div>}
        <div className="px-4 py-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightedBody || '<span class="text-muted-foreground">No content</span>' }} />
      </div>
    );
  }

  if (channel === 'SMS') {
    const charCount = body.length;
    const segments = Math.ceil(charCount / 160) || 1;
    return (
      <div className="max-w-[280px]">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium">SMS Preview</span>
        </div>
        <div className="rounded-2xl bg-green-100 dark:bg-green-900/30 px-4 py-3 relative">
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: highlightedBody || '<span class="text-muted-foreground">No content</span>' }} />
          <div className="absolute -bottom-1 left-4 w-3 h-3 bg-green-100 dark:bg-green-900/30 rotate-45" />
        </div>
        <p className={cn('text-[10px] mt-2', charCount > 160 ? 'text-amber-600' : 'text-muted-foreground')}>
          {charCount}/160 characters · {segments} segment{segments > 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  if (channel === 'PUSH') {
    return (
      <div className="max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium">Push Notification Preview</span>
        </div>
        <div className="rounded-xl border bg-card shadow-lg p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {subject && <p className="text-sm font-semibold truncate">{subject}</p>}
            <p className="text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: highlightedBody }} />
            <p className="text-[10px] text-muted-foreground mt-1">now</p>
          </div>
        </div>
      </div>
    );
  }

  // IN_APP
  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <Smartphone className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-medium">In-App Notification Preview</span>
      </div>
      <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        <div className="flex-1">
          {subject && <p className="text-sm font-medium">{subject}</p>}
          <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: highlightedBody }} />
          <p className="text-[10px] text-muted-foreground mt-1">just now</p>
        </div>
      </div>
    </div>
  );
}
