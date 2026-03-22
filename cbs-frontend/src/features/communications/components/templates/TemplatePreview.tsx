import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { notificationApi, type TemplatePreview as TemplatePreviewType } from '../../api/communicationApi';
import { ChannelBadge } from './ChannelBadge';

interface TemplatePreviewProps {
  templateId: number;
  channel: string;
}

function EmailPreview({ preview, width }: { preview: TemplatePreviewType; width: number }) {
  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden" style={{ maxWidth: width }}>
      <div className="bg-muted/50 px-4 py-2 border-b">
        <p className="text-xs text-muted-foreground">Subject</p>
        <p className="text-sm font-medium">{preview.subject}</p>
      </div>
      <div className="p-4">
        {preview.isHtml ? (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: preview.body }} />
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-sans">{preview.body}</pre>
        )}
      </div>
    </div>
  );
}

function SmsPreview({ preview }: { preview: TemplatePreviewType }) {
  const len = preview.body.length;
  const segments = Math.ceil(len / 160) || 1;
  return (
    <div className="max-w-xs mx-auto">
      <div className="rounded-2xl bg-green-500 text-white p-4 text-sm relative">
        {preview.body}
        <div className="absolute -bottom-1 left-4 w-3 h-3 bg-green-500 transform rotate-45" />
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">{len} chars · {segments} segment{segments > 1 ? 's' : ''}</p>
    </div>
  );
}

function PushPreview({ preview }: { preview: TemplatePreviewType }) {
  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-xl bg-card border shadow-lg p-4 flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🔔</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">BellBank</p>
          <p className="text-sm font-medium truncate">{preview.subject || 'Notification'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preview.body}</p>
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">now</span>
      </div>
    </div>
  );
}

function InAppPreview({ preview }: { preview: TemplatePreviewType }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-4">
        <p className="text-sm font-semibold">{preview.subject || 'Notification'}</p>
        <p className="text-sm text-muted-foreground mt-1">{preview.body}</p>
      </div>
    </div>
  );
}

export function TemplatePreview({ templateId, channel }: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['template-preview', templateId],
    queryFn: () => notificationApi.previewTemplate(templateId),
    enabled: templateId > 0,
    staleTime: 30_000,
  });

  if (isLoading) return <div className="h-48 bg-muted animate-pulse rounded-xl" />;
  if (isError || !preview) return <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">Failed to load preview</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChannelBadge channel={channel} />
          <span className="text-xs text-muted-foreground">Preview with sample data</span>
        </div>
        {channel === 'EMAIL' && (
          <div className="flex gap-1">
            {(['desktop', 'mobile'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} className={cn(
                'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                {mode === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 p-6 flex justify-center">
        {channel === 'EMAIL' && <EmailPreview preview={preview} width={viewMode === 'desktop' ? 600 : 375} />}
        {channel === 'SMS' && <SmsPreview preview={preview} />}
        {channel === 'PUSH' && <PushPreview preview={preview} />}
        {channel === 'IN_APP' && <InAppPreview preview={preview} />}
        {!['EMAIL', 'SMS', 'PUSH', 'IN_APP'].includes(channel) && (
          <pre className="text-sm whitespace-pre-wrap max-w-lg">{preview.body}</pre>
        )}
      </div>
    </div>
  );
}
