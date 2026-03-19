import { cn } from '@/lib/utils';

interface FunnelStep {
  stage: string;
  count: number;
  rate: number;
}

interface CampaignFunnelChartProps {
  steps: FunnelStep[];
}

const STEP_COLORS = [
  'bg-blue-600',
  'bg-blue-500',
  'bg-blue-400',
  'bg-blue-300',
  'bg-blue-200',
];

const STEP_TEXT_COLORS = [
  'text-white',
  'text-white',
  'text-white',
  'text-blue-900',
  'text-blue-800',
];

export function CampaignFunnelChart({ steps }: CampaignFunnelChartProps) {
  if (!steps.length) return null;

  const maxCount = steps[0].count || 1;

  return (
    <div className="space-y-1.5">
      {steps.map((step, index) => {
        const widthPercent = Math.max(20, Math.round((step.count / maxCount) * 100));
        const colorClass = STEP_COLORS[index] ?? 'bg-blue-100';
        const textColorClass = STEP_TEXT_COLORS[index] ?? 'text-blue-900';
        const prevStep = steps[index - 1];

        return (
          <div key={step.stage}>
            {index > 0 && prevStep && (
              <div className="flex items-center justify-center my-1">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-0.5 h-3 bg-muted-foreground/30" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {step.count > 0 && prevStep.count > 0
                      ? `${((step.count / prevStep.count) * 100).toFixed(0)}% pass-through`
                      : '—'}
                  </span>
                  <div className="w-0.5 h-3 bg-muted-foreground/30" />
                </div>
              </div>
            )}
            <div
              className="mx-auto transition-all duration-300"
              style={{ width: `${widthPercent}%` }}
            >
              <div className={cn('rounded-md px-4 py-2.5 flex items-center justify-between', colorClass)}>
                <span className={cn('text-sm font-semibold', textColorClass)}>{step.stage}</span>
                <div className={cn('text-right', textColorClass)}>
                  <p className="text-sm font-bold">{step.count.toLocaleString()}</p>
                  {index === 0 && (
                    <p className="text-xs opacity-80">100%</p>
                  )}
                  {index > 0 && (
                    <p className="text-xs opacity-80">
                      {maxCount > 0 ? `${((step.count / maxCount) * 100).toFixed(1)}% of total` : '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
