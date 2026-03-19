import { cn } from '@/lib/utils';
import { Edit2, Archive } from 'lucide-react';
import type { NotificationTemplate, NotificationChannel, NotificationCategory } from '../../api/notificationAdminApi';

interface TemplateTableProps {
  templates: NotificationTemplate[];
  onEdit: (t: NotificationTemplate) => void;
  onArchive: (id: string) => void;
}

const channelBadge: Record<NotificationChannel, string> = {
  EMAIL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const categoryBadge: Record<NotificationCategory, string> = {
  TRANSACTION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACCOUNT: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  LOAN: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CARD: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  SECURITY: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MARKETING: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  SYSTEM: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DRAFT: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

const languageLabel: Record<string, string> = {
  EN: 'English',
  YO: 'Yoruba',
  HA: 'Hausa',
  IG: 'Igbo',
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  );
}

export function TemplateTable({ templates, onEdit, onArchive }: TemplateTableProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No templates match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Channel</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Language</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Usage MTD</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {templates.map((tpl) => (
            <tr
              key={tpl.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onEdit(tpl)}
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{tpl.code}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{tpl.name}</span>
              </td>
              <td className="px-4 py-3">
                <Badge label={tpl.channel} className={channelBadge[tpl.channel]} />
              </td>
              <td className="px-4 py-3">
                <Badge label={tpl.category} className={categoryBadge[tpl.category]} />
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {languageLabel[tpl.language] ?? tpl.language}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {tpl.usageMTD.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Badge label={tpl.status} className={statusBadge[tpl.status] ?? statusBadge.DRAFT} />
              </td>
              <td className="px-4 py-3">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onEdit(tpl)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {tpl.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => onArchive(tpl.id)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                      title="Archive template"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
