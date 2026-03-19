import { MessageSquare, Mail, Phone, FileText, AlertTriangle, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DunningStep {
  day: number;
  label: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: DunningStep[] = [
  { day: 1, label: 'SMS', icon: MessageSquare, color: 'bg-blue-500 text-white' },
  { day: 3, label: 'Email', icon: Mail, color: 'bg-indigo-500 text-white' },
  { day: 7, label: 'Call', icon: Phone, color: 'bg-amber-500 text-white' },
  { day: 14, label: 'Letter', icon: FileText, color: 'bg-orange-500 text-white' },
  { day: 30, label: 'Final Notice', icon: AlertTriangle, color: 'bg-red-500 text-white' },
  { day: 60, label: 'Legal', icon: Scale, color: 'bg-red-900 text-white' },
];

export function DunningTimeline() {
  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="text-sm font-semibold text-foreground mb-6">Standard Dunning Workflow</h3>
      <div className="relative flex items-center justify-between overflow-x-auto pb-2">
        {/* Connecting line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-border" />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="relative flex flex-col items-center gap-2 flex-shrink-0 px-2"
            >
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-sm z-10', step.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">Day {step.day}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
