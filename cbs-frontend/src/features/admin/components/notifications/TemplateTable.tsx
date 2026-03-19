import { cn } from '@/lib/utils';
import { Edit2, Archive, Send, Eye } from 'lucide-react';
import type { NotificationTemplate, NotificationChannel } from '../../api/notificationAdminApi';

interface TemplateTableProps {
  templates: NotificationTemplate[];
  onEdit: (template: NotificationTemplate) => void;
  onArchive: (id: number | string) => void;
  onPreview?: (template: NotificationTemplate) => void;
  onTestSend?: (template: NotificationTemplate) => void;
}

const CHANNEL_BADGE: Record<NotificationChannel, string> = {
  EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  WEBHOOK: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  EMAIL: '📧', SMS: '📱', PUSH: '🔔', IN_APP: '🖥️', WEBHOOK: '🔗',
};

export function TemplateTable({ templates, onEdit, onArchive, onPreview, onTestSend }: TemplateTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Channel</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event Type</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {templates.map(t => (
            <tr key={t.id} className="hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.templateCode}</td>
              <td className="px-4 py-3 font-medium">{t.templateName}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', CHANNEL_BADGE[t.channel])}>
                  {CHANNEL_ICONS[t.channel]} {t.channel}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{t.eventType}</td>
              <td className="px-4 py-3 text-xs max-w-[200px] truncate">{t.subject || '—'}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  t.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400')}>
                  {t.isActive ? 'PUBLISHED' : 'DRAFT'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {onPreview && (
                    <button onClick={() => onPreview(t)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Preview">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onTestSend && (
                    <button onClick={() => onTestSend(t)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Test Send">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => onArchive(t.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-600 transition-colors" title="Archive">
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {templates.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No templates found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
