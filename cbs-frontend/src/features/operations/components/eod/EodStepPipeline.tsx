import { ChevronRight } from 'lucide-react';
import { EodStepCard } from './EodStepCard';
import type { EodStep } from '../../api/eodApi';

interface EodStepPipelineProps {
  steps: EodStep[];
  onStepClick: (step: EodStep) => void;
}

export function EodStepPipeline({ steps, onStepClick }: EodStepPipelineProps) {
  const completedCount = steps.filter((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED').length;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeStep = steps.find((s) => s.status === 'RUNNING');

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-1 min-w-max px-1">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1">
              <button
                onClick={() => onStepClick(step)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                disabled={step.status !== 'FAILED'}
                title={step.status === 'FAILED' ? `Click to manage failed step: ${step.stepName}` : step.stepName}
              >
                <EodStepCard
                  step={step}
                  isActive={activeStep?.id === step.id}
                />
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completedCount} of {totalCount} steps complete</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
