import { formatDateTime } from '@/lib/formatters';

interface TimelineStep {
  label: string;
  status: 'completed' | 'in-progress' | 'pending';
  timestamp?: string;
  description?: string;
}

const defaultSteps: TimelineStep[] = [
  { label: 'Initiated', status: 'pending' },
  { label: 'Compliance Cleared', status: 'pending' },
  { label: 'Account Debited', status: 'pending' },
  { label: 'Sent to SWIFT', status: 'pending' },
  { label: 'Delivered to Beneficiary', status: 'pending' },
];

interface Props {
  steps?: TimelineStep[];
}

export function TransferTracker({ steps }: Props) {
  const timeline = steps && steps.length > 0 ? steps : defaultSteps;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Transfer Status</h3>
      <div className="space-y-0">
        {timeline.map((step, idx) => {
          const isLast = idx === timeline.length - 1;

          const dotClasses =
            step.status === 'completed'
              ? 'w-3 h-3 rounded-full bg-green-500'
              : step.status === 'in-progress'
                ? 'w-3 h-3 rounded-full bg-blue-500 animate-pulse'
                : 'w-3 h-3 rounded-full border-2 border-gray-300 bg-transparent';

          const lineClasses =
            step.status === 'completed'
              ? 'w-px flex-1 min-h-[24px] bg-green-400'
              : 'w-px flex-1 min-h-[24px] border-l border-dashed border-gray-300';

          return (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`mt-1 ${dotClasses}`} />
                {!isLast && <div className={lineClasses} />}
              </div>
              <div className="pb-4">
                <p
                  className={`text-sm font-bold ${
                    step.status === 'pending' ? 'text-muted-foreground' : ''
                  }`}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-muted-foreground">{formatDateTime(step.timestamp)}</p>
                )}
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
