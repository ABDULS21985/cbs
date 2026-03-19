import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FunnelStep } from '../../api/customerAnalyticsApi';

interface AcquisitionFunnelProps {
  data: FunnelStep[];
  isLoading: boolean;
}

const STEP_COLORS = [
  { bg: 'bg-blue-900', text: 'text-white', border: 'border-blue-900' },
  { bg: 'bg-blue-800', text: 'text-white', border: 'border-blue-800' },
  { bg: 'bg-blue-700', text: 'text-white', border: 'border-blue-700' },
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600' },
  { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' },
  { bg: 'bg-blue-400', text: 'text-blue-950', border: 'border-blue-400' },
  { bg: 'bg-blue-300', text: 'text-blue-950', border: 'border-blue-300' },
];

function FunnelTooltip({ step, onClose }: { step: FunnelStep; onClose: () => void }) {
  if (!step.dropOffReasons || step.dropOffReasons.length === 0) return null;
  return (
    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 w-64 rounded-lg border bg-popover shadow-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">Drop-off Reasons</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <ul className="space-y-1">
        {step.dropOffReasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <span className="text-muted-foreground">{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AcquisitionFunnel({ data, isLoading }: AcquisitionFunnelProps) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-muted rounded animate-pulse"
              style={{ width: `${100 - i * 8}%`, margin: '0 auto' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Acquisition Funnel</h2>
      <div className="flex flex-col items-center gap-0.5">
        {data.map((step, index) => {
          const widthPct = 40 + (60 * step.count) / maxCount;
          const colors = STEP_COLORS[index] ?? STEP_COLORS[STEP_COLORS.length - 1];
          const isActive = activeStep === index;
          const hasReasons = step.dropOffReasons && step.dropOffReasons.length > 0;

          return (
            <div
              key={step.stage}
              className="relative w-full flex justify-center"
            >
              <button
                className={cn(
                  'relative flex items-center justify-between px-4 py-2.5 rounded transition-all duration-200',
                  colors.bg,
                  colors.text,
                  hasReasons && 'cursor-pointer hover:opacity-90',
                  !hasReasons && 'cursor-default',
                  isActive && 'ring-2 ring-offset-1 ring-white/40',
                )}
                style={{ width: `${widthPct}%` }}
                onClick={() => hasReasons && setActiveStep(isActive ? null : index)}
                title={hasReasons ? 'Click to see drop-off reasons' : undefined}
              >
                <span className="text-xs font-semibold truncate">{step.stage}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold tabular-nums">{step.count.toLocaleString()}</span>
                  {index > 0 && (
                    <span className="text-xs opacity-75">({step.conversionPct.toFixed(0)}%)</span>
                  )}
                  {hasReasons && (
                    <span className="text-xs opacity-60">↗</span>
                  )}
                </div>
              </button>
              {isActive && hasReasons && (
                <FunnelTooltip step={step} onClose={() => setActiveStep(null)} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Click a stage to view drop-off reasons
      </p>
    </div>
  );
}
