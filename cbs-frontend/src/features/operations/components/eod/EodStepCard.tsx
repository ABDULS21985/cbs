import { Loader2, CheckCircle2, Circle, XCircle, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EodStep } from '../../api/eodApi';

interface EodStepCardProps {
  step: EodStep;
  isActive: boolean;
}

function formatDurationShort(ms?: number): string {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function getStepConfig(status: EodStep['status'], isActive: boolean) {
  switch (status) {
    case 'COMPLETED':
      return {
        bg: 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700',
        text: 'text-green-800 dark:text-green-300',
        icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
      };
    case 'RUNNING':
      return {
        bg: cn(
          'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700',
          isActive && 'animate-pulse',
        ),
        text: 'text-blue-800 dark:text-blue-300',
        icon: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
      };
    case 'FAILED':
      return {
        bg: 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700',
        text: 'text-red-800 dark:text-red-300',
        icon: <XCircle className="w-4 h-4 text-red-600" />,
      };
    case 'SKIPPED':
      return {
        bg: 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: <SkipForward className="w-4 h-4 text-yellow-600" />,
      };
    default:
      return {
        bg: 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700',
        text: 'text-gray-500 dark:text-gray-400',
        icon: <Circle className="w-4 h-4 text-gray-400" />,
      };
  }
}

export function EodStepCard({ step, isActive }: EodStepCardProps) {
  const { bg, text, icon } = getStepConfig(step.status, isActive);
  const durationLabel = step.status === 'PENDING'
    ? 'waiting'
    : step.status === 'RUNNING'
    ? 'running...'
    : formatDurationShort(step.durationMs) || '--';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 w-24 flex-shrink-0 transition-all',
        bg,
        isActive && 'ring-2 ring-blue-400 ring-offset-1',
      )}
    >
      <div className="flex items-center gap-1">
        {icon}
      </div>
      <span className={cn('text-xs font-semibold text-center leading-tight', text)}>
        {step.shortLabel}
      </span>
      <span className={cn('text-[10px] text-center', text, 'opacity-70')}>
        {durationLabel}
      </span>
    </div>
  );
}
