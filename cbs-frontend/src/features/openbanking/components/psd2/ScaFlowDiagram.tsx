import { cn } from '@/lib/utils';
import {
  Send,
  ShieldCheck,
  Fingerprint,
  FileCheck,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ScaFlowDiagramProps {
  currentStep?: number;
}

interface FlowStep {
  step: number;
  label: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: FlowStep[] = [
  {
    step: 1,
    label: 'TPP Requests',
    description: 'TPP initiates access request via API',
    icon: Send,
  },
  {
    step: 2,
    label: 'Bank Initiates SCA',
    description: 'ASPSP creates SCA session and selects auth method',
    icon: ShieldCheck,
  },
  {
    step: 3,
    label: 'Customer Authenticates',
    description: 'Customer completes strong authentication challenge',
    icon: Fingerprint,
  },
  {
    step: 4,
    label: 'Consent Granted',
    description: 'Customer authorises specific scopes and data access',
    icon: FileCheck,
  },
  {
    step: 5,
    label: 'Token Issued',
    description: 'Access token issued to TPP with granted scopes',
    icon: KeyRound,
  },
];

function getStepState(stepNumber: number, currentStep: number) {
  if (currentStep === 0) return 'idle';
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'active';
  return 'pending';
}

export function ScaFlowDiagram({ currentStep = 0 }: ScaFlowDiagramProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="text-sm font-semibold mb-1">SCA Authentication Flow</h3>
      <p className="text-xs text-muted-foreground mb-6">
        PSD2 Strong Customer Authentication (SCA) process for TPP access authorization
      </p>

      {/* Desktop flow - horizontal */}
      <div className="hidden md:flex items-start justify-between gap-2">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.step, currentStep);
          const Icon = step.icon;
          return (
            <div key={step.step} className="flex items-start flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors',
                    state === 'completed' && 'bg-green-100 dark:bg-green-900/30',
                    state === 'active' && 'bg-primary/10 ring-2 ring-primary',
                    state === 'pending' && 'bg-muted',
                    state === 'idle' && 'bg-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      state === 'completed' && 'text-green-600',
                      state === 'active' && 'text-primary',
                      state === 'pending' && 'text-muted-foreground/50',
                      state === 'idle' && 'text-muted-foreground',
                    )}
                  />
                </div>
                <div
                  className={cn(
                    'text-xs font-semibold mb-1',
                    state === 'active' && 'text-primary',
                    state === 'completed' && 'text-green-600',
                    state === 'pending' && 'text-muted-foreground/50',
                  )}
                >
                  Step {step.step}
                </div>
                <div
                  className={cn(
                    'text-xs font-medium',
                    state === 'pending' && 'text-muted-foreground/50',
                  )}
                >
                  {step.label}
                </div>
                <p
                  className={cn(
                    'text-[11px] text-muted-foreground mt-1 max-w-[140px]',
                    state === 'pending' && 'opacity-50',
                  )}
                >
                  {step.description}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex items-center pt-5 px-1">
                  <ChevronRight
                    className={cn(
                      'w-5 h-5',
                      getStepState(step.step + 1, currentStep) === 'completed' ||
                        getStepState(step.step + 1, currentStep) === 'active'
                        ? 'text-primary'
                        : 'text-muted-foreground/30',
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile flow - vertical */}
      <div className="md:hidden space-y-4">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.step, currentStep);
          const Icon = step.icon;
          return (
            <div key={step.step}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    state === 'completed' && 'bg-green-100 dark:bg-green-900/30',
                    state === 'active' && 'bg-primary/10 ring-2 ring-primary',
                    state === 'pending' && 'bg-muted',
                    state === 'idle' && 'bg-muted',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      state === 'completed' && 'text-green-600',
                      state === 'active' && 'text-primary',
                      state === 'pending' && 'text-muted-foreground/50',
                      state === 'idle' && 'text-muted-foreground',
                    )}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    Step {step.step}: {step.label}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="ml-5 border-l-2 border-dashed h-4 my-1 border-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
