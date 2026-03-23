import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
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
    <div className={cn('px-6 pt-5 pb-0', className)}>
      <div className="page-header-shell mx-auto max-w-[1680px]">
        <div className="page-header-grid">
          <div className="page-header-main">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                className="page-header-back"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {Icon && (
              <div className={cn('page-header-icon', iconBg || 'bg-primary/10')}>
                <Icon className={cn('h-5 w-5', iconColor || 'text-primary')} />
              </div>
            )}
            <div className="page-header-copy">
              <h1 className="page-header-title">{title}</h1>
              {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>
        {tabs && <div className="page-header-tabs">{tabs}</div>}
      </div>
    </div>
  );
}
