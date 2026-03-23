import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Flag,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'milestone' | 'compliance' | 'audit' | 'update';
  status: 'completed' | 'upcoming' | 'in-progress';
  icon: LucideIcon;
}

const EVENTS: TimelineEvent[] = [
  {
    id: '1',
    date: '2025-01-15',
    title: 'PSD2 API v2.0 Launch',
    description: 'Dedicated PSD2 interface launched with full AISP/PISP support.',
    type: 'milestone',
    status: 'completed',
    icon: Flag,
  },
  {
    id: '2',
    date: '2025-03-20',
    title: 'SCA Implementation Complete',
    description: 'Multi-factor SCA with SMS OTP, push, biometric, and hardware token methods deployed.',
    type: 'compliance',
    status: 'completed',
    icon: ShieldCheck,
  },
  {
    id: '3',
    date: '2025-06-10',
    title: 'NCA Compliance Audit',
    description: 'Annual regulatory audit by the National Competent Authority passed successfully.',
    type: 'audit',
    status: 'completed',
    icon: FileText,
  },
  {
    id: '4',
    date: '2025-09-01',
    title: 'Consent Dashboard for Customers',
    description: 'Customer-facing consent management portal deployed allowing real-time consent visibility and revocation.',
    type: 'milestone',
    status: 'completed',
    icon: CheckCircle2,
  },
  {
    id: '5',
    date: '2025-12-15',
    title: 'SCA Exemption Engine v2',
    description: 'Enhanced transaction risk analysis engine for SCA exemptions under RTS Article 18.',
    type: 'compliance',
    status: 'completed',
    icon: ShieldCheck,
  },
  {
    id: '6',
    date: '2026-03-01',
    title: 'PSD3 Readiness Assessment',
    description: 'Gap analysis and readiness assessment for upcoming PSD3 regulatory framework.',
    type: 'compliance',
    status: 'in-progress',
    icon: Clock,
  },
  {
    id: '7',
    date: '2026-06-30',
    title: 'Annual NCA Audit',
    description: 'Scheduled annual compliance audit with the National Competent Authority.',
    type: 'audit',
    status: 'upcoming',
    icon: Calendar,
  },
  {
    id: '8',
    date: '2026-09-01',
    title: 'Open Finance API Extension',
    description: 'Extension of open banking APIs to cover insurance, investments, and pensions data.',
    type: 'milestone',
    status: 'upcoming',
    icon: Flag,
  },
];

const STATUS_STYLES = {
  completed: {
    dot: 'bg-green-500',
    line: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  },
  'in-progress': {
    dot: 'bg-amber-500 animate-pulse',
    line: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  },
  upcoming: {
    dot: 'bg-muted-foreground/30',
    line: 'border-border',
    badge: 'bg-muted text-muted-foreground',
  },
};

export function RegulatoryTimeline() {
  return (
    <div className="surface-card p-6">
      <h3 className="text-sm font-semibold mb-1">Regulatory Timeline</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Key compliance milestones and regulatory events
      </p>

      <div className="relative">
        {EVENTS.map((event, idx) => {
          const styles = STATUS_STYLES[event.status];
          const Icon = event.icon;
          const isLast = idx === EVENTS.length - 1;

          return (
            <div key={event.id} className="flex gap-4">
              {/* Timeline line and dot */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0 mt-1',
                    styles.dot,
                  )}
                />
                {!isLast && (
                  <div className={cn('w-px flex-1 border-l-2', styles.line)} />
                )}
              </div>

              {/* Content */}
              <div className={cn('pb-6', isLast && 'pb-0')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className={cn('ui-chip', styles.badge)}>
                    {event.status === 'in-progress' ? 'In Progress' : event.status === 'completed' ? 'Completed' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('w-4 h-4', event.status === 'upcoming' ? 'text-muted-foreground/50' : 'text-primary')} />
                  <h4 className="text-sm font-medium">{event.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
