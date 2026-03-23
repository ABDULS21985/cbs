import { Check, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  getStepValidation?: (step: number) => 'complete' | 'error' | 'unvisited';
  descriptions?: string[];
}

export function WizardStepper({ steps, currentStep, onStepClick, getStepValidation, descriptions }: WizardStepperProps) {
  const progress = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
  const completedSteps = steps.filter((_, i) => getStepValidation?.(i + 1) === 'complete').length;

  return (
    <div className="onboarding-stepper-shell space-y-5" role="navigation" aria-label="Onboarding wizard progress">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Journey Map</p>
          <h2 className="mt-2 text-base font-semibold">Customer Onboarding</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track completion and jump back to reviewed sections.</p>
        </div>
        <div className="onboarding-hero-chip font-mono">{completedSteps}/{steps.length}</div>
      </div>

      <div className="space-y-2">
        <div
          className="onboarding-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progress}% complete`}
        >
          <div className="onboarding-progress-fill transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <span>Step {currentStep} of {steps.length}</span>
        </div>
      </div>

      <div className="hidden lg:grid gap-2">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const validation = getStepValidation?.(stepNum) ?? 'unvisited';
          const canClick = isCurrent || isDone || validation !== 'unvisited';
          const statusLabel = validation === 'complete'
            ? 'Complete'
            : validation === 'error'
              ? 'Needs attention'
              : isCurrent
                ? 'In progress'
                : 'Not started';

          return (
            <div key={stepNum}>
              <button
                type="button"
                className={cn(
                  'onboarding-stepper-item',
                  isCurrent && 'onboarding-stepper-item-active',
                  validation === 'complete' && !isCurrent && 'onboarding-stepper-item-complete',
                  validation === 'error' && !isCurrent && 'onboarding-stepper-item-error',
                  validation === 'unvisited' && !isCurrent && 'onboarding-stepper-item-idle',
                )}
                onClick={() => canClick && onStepClick?.(stepNum)}
                disabled={!canClick}
                title={`Step ${stepNum}: ${label}${validation === 'complete' ? ' (Complete)' : validation === 'error' ? ' (Needs attention)' : ''}`}
                aria-label={`Step ${stepNum}: ${label}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className={cn(
                  'onboarding-stepper-index',
                  isCurrent && 'border-primary/30 bg-primary/10 text-primary',
                  validation === 'complete' && !isCurrent && 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600',
                  validation === 'error' && !isCurrent && 'border-amber-500/20 bg-amber-500/12 text-amber-600',
                )}>
                  {validation === 'complete' && !isCurrent ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : validation === 'error' && !isCurrent ? (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : isDone && !isCurrent ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    stepNum
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('text-sm font-semibold', isCurrent && 'text-primary')}>{label}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                        validation === 'complete' && 'bg-emerald-500/12 text-emerald-600',
                        validation === 'error' && 'bg-amber-500/12 text-amber-600',
                        isCurrent && 'bg-primary/12 text-primary',
                        validation === 'unvisited' && !isCurrent && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {descriptions?.[i] ?? `Complete the ${label.toLowerCase()} details.`}
                  </p>
                  <span className="sr-only">{statusLabel}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="lg:hidden rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Step {currentStep} of {steps.length}</span>
          <span className="text-sm text-muted-foreground">{steps[currentStep - 1]}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {descriptions?.[currentStep - 1] ?? 'Complete the current onboarding step to continue.'}
        </p>
      </div>
    </div>
  );
}
