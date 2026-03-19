import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-2 gap-0">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              className="flex flex-col items-center gap-1 shrink-0"
              onClick={() => isDone && onStepClick?.(stepNum)}
              disabled={!isDone}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  isDone && 'bg-blue-600 border-blue-600 text-white cursor-pointer hover:bg-blue-700',
                  isCurrent && 'border-blue-600 text-blue-600 bg-white dark:bg-gray-900',
                  !isDone && !isCurrent && 'border-gray-300 text-gray-400 bg-white dark:bg-gray-900 dark:border-gray-600',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap hidden sm:block',
                  isCurrent && 'text-blue-600 font-medium',
                  isDone && 'text-gray-700 dark:text-gray-300',
                  !isDone && !isCurrent && 'text-gray-400',
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2',
                  stepNum < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
