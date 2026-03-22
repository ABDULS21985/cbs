import { useQuery } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/formatters';
import { Clock } from 'lucide-react';
import { notificationApi } from '../../api/communicationApi';

// Note: the backend /templates/{id}/versions endpoint exists but returns [] currently.
// We show version info from the template metadata itself.

interface TemplateVersionHistoryProps {
  templateId: number;
  currentVersion: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export function TemplateVersionHistory({ templateId, currentVersion, createdAt, updatedAt, createdBy }: TemplateVersionHistoryProps) {
  // Attempt to fetch version history from API
  const { data: versions = [] } = useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: () => notificationApi.getTemplateVersions(templateId),
    enabled: templateId > 0,
    staleTime: 60_000,
  });

  // Build events from template metadata + any API versions
  const events = [
    { version: 1, action: 'Template Created', actor: createdBy ?? 'System', timestamp: createdAt },
  ];

  if (currentVersion > 1 && updatedAt) {
    events.push({ version: currentVersion, action: 'Template Updated', actor: createdBy ?? 'Editor', timestamp: updatedAt });
  }

  // Merge API versions if available
  versions.forEach((v) => {
    if (typeof v === 'object' && v.versionNumber) {
      events.push({
        version: v.versionNumber,
        action: String(v.changeSummary ?? 'Modified'),
        actor: String(v.changedBy ?? 'System'),
        timestamp: String(v.createdAt ?? ''),
      });
    }
  });

  // Deduplicate and sort desc
  const unique = events.reduce((acc, ev) => {
    if (!acc.find(e => e.version === ev.version)) acc.push(ev);
    return acc;
  }, [] as typeof events).sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-1">
      {unique.map((ev, i) => (
        <div key={ev.version} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            {i < unique.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className="pb-4 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">v{ev.version}</span>
              <span className="text-sm font-medium">{ev.action}</span>
            </div>
            <p className="text-xs text-muted-foreground">{ev.actor} · {ev.timestamp ? formatDateTime(ev.timestamp) : '—'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
