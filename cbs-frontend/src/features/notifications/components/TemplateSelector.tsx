import { useState, useMemo } from 'react';
import { Search, Mail, MessageSquare, Bell, Smartphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationTemplates } from '../hooks/useNotificationsExt';
import type { NotificationTemplate } from '../types/notificationExt';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  SMS: <MessageSquare className="w-3.5 h-3.5" />,
  PUSH: <Bell className="w-3.5 h-3.5" />,
  IN_APP: <Smartphone className="w-3.5 h-3.5" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function TemplateSelector({ selected, onSelect }: {
  selected: NotificationTemplate | null;
  onSelect: (template: NotificationTemplate | null) => void;
}) {
  const { data: templates = [], isLoading } = useNotificationTemplates();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    let list = templates;
    if (channelFilter !== 'ALL') list = list.filter((t) => t.channel === channelFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        (t.code ?? '').toLowerCase().includes(q) ||
        (t.subject ?? '').toLowerCase().includes(q) ||
        (t.eventType ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, search, channelFilter]);

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..."
          className="w-full pl-10 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {/* Channel filter */}
      <div className="flex gap-1.5">
        {['ALL', 'EMAIL', 'SMS', 'PUSH', 'IN_APP'].map((ch) => (
          <button key={ch} onClick={() => setChannelFilter(ch)}
            className={cn('px-2 py-1 text-xs font-medium rounded-md transition-colors',
              channelFilter === ch ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
            {ch === 'ALL' ? 'All' : ch}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No templates found</p>
        ) : filtered.map((template) => {
          const isSelected = selected?.id === template.id;
          return (
            <button key={template.id} onClick={() => onSelect(isSelected ? null : template)}
              className={cn('text-left rounded-lg border p-3 transition-all',
                isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{template.subject || template.code || 'Untitled'}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', CHANNEL_COLORS[template.channel])}>
                      {CHANNEL_ICONS[template.channel]} {template.channel}
                    </span>
                    {template.eventType && <span className="text-[10px] text-muted-foreground">{template.eventType}</span>}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{template.code}</span>
              </div>
              {template.bodyTemplate && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.bodyTemplate.slice(0, 80)}...</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
