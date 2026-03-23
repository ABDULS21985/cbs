import type { ElementType } from 'react';
import { AlertTriangle, FileText, Mail, MessageSquare, Phone, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DunningStep {
  day: number;
  label: string;
  description: string;
  icon: ElementType;
  tone: string;
}

const STEPS: DunningStep[] = [
  { day: 1, label: 'SMS', description: 'Immediate delinquency notification to the borrower.', icon: MessageSquare, tone: 'text-sky-600 bg-sky-500/10' },
  { day: 3, label: 'Email', description: 'Follow-up digital reminder with payment context.', icon: Mail, tone: 'text-indigo-600 bg-indigo-500/10' },
  { day: 7, label: 'Call', description: 'Collector outreach to confirm intent and next actions.', icon: Phone, tone: 'text-amber-600 bg-amber-500/10' },
  { day: 14, label: 'Letter', description: 'Formal written notice into the collection trail.', icon: FileText, tone: 'text-orange-600 bg-orange-500/10' },
  { day: 30, label: 'Final Notice', description: 'Escalated warning before pre-legal treatment.', icon: AlertTriangle, tone: 'text-rose-600 bg-rose-500/10' },
  { day: 60, label: 'Legal', description: 'Case moves to formal legal escalation workflow.', icon: Scale, tone: 'text-red-700 bg-red-500/10' },
];

export function DunningTimeline() {
  return (
    <div className="lending-section-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Policy Path</p>
          <h3 className="mt-2 text-lg font-semibold">Standard Dunning Workflow</h3>
          <p className="mt-1 text-sm text-muted-foreground">Reference cadence for borrower outreach as delinquency deepens.</p>
        </div>
        <div className="lending-hero-chip">Day-based escalation map</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', step.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="lending-hero-chip">Day {step.day}</span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
