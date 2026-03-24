import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PortalPageHeroMetric {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'warning';
}

interface PortalPageHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  chips?: string[];
  metrics?: PortalPageHeroMetric[];
  actions?: ReactNode;
  className?: string;
}

const metricToneClass: Record<NonNullable<PortalPageHeroMetric['tone']>, string> = {
  default: 'text-foreground',
  positive: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

export function PortalPageHero({
  icon: Icon,
  title,
  description,
  eyebrow,
  chips = [],
  metrics = [],
  actions,
  className,
}: PortalPageHeroProps) {
  return (
    <section className={cn('portal-page-hero', className)}>
      <div className="portal-page-hero-main">
        <div className="portal-page-hero-icon">
          <Icon className="h-6 w-6" />
        </div>

        <div className="portal-page-hero-copy">
          {eyebrow ? <p className="portal-page-hero-eyebrow">{eyebrow}</p> : null}
          <h1 className="portal-page-hero-title">{title}</h1>
          <p className="portal-page-hero-description">{description}</p>

          {chips.length > 0 ? (
            <div className="portal-page-hero-chip-row">
              {chips.map((chip) => (
                <span key={chip} className="portal-page-hero-chip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {actions || metrics.length > 0 ? (
        <div className="portal-page-hero-side">
          {actions ? <div className="portal-page-hero-actions">{actions}</div> : null}

          {metrics.length > 0 ? (
            <div className="portal-page-hero-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="portal-page-hero-metric">
                  <p className="portal-page-hero-metric-label">{metric.label}</p>
                  <p
                    className={cn(
                      'portal-page-hero-metric-value',
                      metricToneClass[metric.tone ?? 'default'],
                    )}
                  >
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
