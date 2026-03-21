import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export function PageHeader({ title, subtitle, backTo, actions, tabs, className, icon: Icon, iconBg, iconColor }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('px-6 pt-4 pb-2', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {backTo && (
            <button
              onClick={() => navigate(backTo)}
              className="mt-1 p-1 rounded-md hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {Icon && (
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mt-0.5', iconBg || 'bg-primary/10')}>
              <Icon className={cn('w-5 h-5', iconColor || 'text-primary')} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 -mb-2">{tabs}</div>}
    </div>
  );
}
