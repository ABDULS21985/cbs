import { Check, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  getStepValidation?: (step: number) => 'complete' | 'error' | 'unvisited';
}

export function WizardStepper({ steps, currentStep, onStepClick, getStepValidation }: WizardStepperProps) {
  const progress = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
  const completedSteps = steps.filter((_, i) => getStepValidation?.(i + 1) === 'complete').length;

  return (
    <div className="space-y-3" role="navigation" aria-label="Onboarding wizard progress">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress}% complete`}>
          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{completedSteps}/{steps.length}</span>
      </div>

      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center w-full overflow-x-auto pb-1 gap-0">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const validation = getStepValidation?.(stepNum) ?? 'unvisited';
          const canClick = isDone || validation !== 'unvisited';

          return (
            <div key={stepNum} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                className="flex flex-col items-center gap-1 shrink-0 group"
                onClick={() => canClick && onStepClick?.(stepNum)}
                disabled={!canClick}
                title={`Step ${stepNum}: ${label}${validation === 'complete' ? ' (Complete)' : validation === 'error' ? ' (Needs attention)' : ''}`}
                aria-label={`Step ${stepNum}: ${label}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200',
                  // Complete
                  validation === 'complete' && !isCurrent && 'bg-green-500 border-green-500 text-white cursor-pointer group-hover:bg-green-600 group-hover:scale-105',
                  // Error
                  validation === 'error' && !isCurrent && 'bg-amber-500 border-amber-500 text-white cursor-pointer group-hover:bg-amber-600 group-hover:scale-105',
                  // Current
                  isCurrent && 'border-primary text-primary bg-background ring-2 ring-primary/30 scale-110',
                  // Unvisited
                  validation === 'unvisited' && !isCurrent && 'border-border text-muted-foreground bg-background',
                  // Done but unvisited validation
                  isDone && validation === 'unvisited' && 'bg-primary border-primary text-primary-foreground cursor-pointer',
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
                <span className={cn(
                  'text-[10px] whitespace-nowrap transition-colors',
                  isCurrent && 'text-primary font-bold',
                  validation === 'complete' && !isCurrent && 'text-green-600 dark:text-green-400 font-medium',
                  validation === 'error' && !isCurrent && 'text-amber-600 dark:text-amber-400 font-medium',
                  validation === 'unvisited' && !isCurrent && 'text-muted-foreground',
                )}>
                  {label}
                </span>
                {/* Validation status text for screen readers */}
                <span className="sr-only">
                  {validation === 'complete' ? 'Complete' : validation === 'error' ? 'Needs attention' : isCurrent ? 'Current step' : 'Not started'}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-1.5 rounded-full transition-colors duration-300',
                  stepNum < currentStep && validation === 'complete' ? 'bg-green-500' :
                  stepNum < currentStep ? 'bg-primary' : 'bg-muted',
                )} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile stepper */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Step {currentStep} of {steps.length}</span>
          <span className="text-sm text-muted-foreground">{steps[currentStep - 1]}</span>
        </div>
      </div>
    </div>
  );
}
