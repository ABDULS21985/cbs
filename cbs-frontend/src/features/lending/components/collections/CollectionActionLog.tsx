import { Phone, Mail, FileText, AlertTriangle, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface CollectionAction {
  id: number;
  type: 'CALL' | 'EMAIL' | 'LETTER' | 'LEGAL' | 'SMS';
  date: string;
  outcome: string;
  agent: string;
  notes?: string;
}

interface CollectionActionLogProps {
  actions?: CollectionAction[];
}

const ACTION_CONFIG: Record<CollectionAction['type'], { icon: React.ElementType; color: string; label: string }> = {
  CALL: { icon: Phone, color: 'bg-amber-100 text-amber-700', label: 'Call' },
  EMAIL: { icon: Mail, color: 'bg-indigo-100 text-indigo-700', label: 'Email' },
  LETTER: { icon: FileText, color: 'bg-orange-100 text-orange-700', label: 'Letter' },
  LEGAL: { icon: AlertTriangle, color: 'bg-red-100 text-red-700', label: 'Legal' },
  SMS: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700', label: 'SMS' },
};

export function CollectionActionLog({ actions = [] }: CollectionActionLogProps) {
  if (actions.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">No collection actions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Collection Action Log</h3>
      <div className="space-y-0">
        {actions.map((action, index) => {
          const config = ACTION_CONFIG[action.type];
          const Icon = config.icon;
          const isLast = index === actions.length - 1;
          return (
            <div key={action.id} className="flex gap-3">
              {/* Icon + connector line */}
              <div className="flex flex-col items-center">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && <div className="w-0.5 bg-border flex-1 my-1" style={{ minHeight: '16px' }} />}
              </div>
              {/* Content */}
              <div className={cn('pb-4', isLast ? '' : '')}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(action.date)}</span>
                </div>
                <p className="text-sm text-foreground mt-0.5">{action.outcome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">by {action.agent}</p>
                {action.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{action.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
