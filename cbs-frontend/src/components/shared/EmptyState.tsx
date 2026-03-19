import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <Icon className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-base font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
