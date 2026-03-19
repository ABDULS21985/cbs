import { useEffect, useState } from 'react';
import { PhoneCall, Coffee, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Counter } from '../../api/branchOpsApi';

interface QueueCounterProps {
  counter: Counter;
  onCallNext: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function useDurationTimer(startedAt: string, active: boolean): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsed(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  if (!active) return '';
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const typeBadgeColors: Record<Counter['type'], string> = {
  TELLER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CSO: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MANAGER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusDotColors: Record<Counter['status'], string> = {
  SERVING: 'bg-green-500',
  IDLE: 'bg-gray-400',
  BREAK: 'bg-amber-400',
};

export function QueueCounter({ counter, onCallNext }: QueueCounterProps) {
  const isServing = counter.status === 'SERVING';
  const isIdle = counter.status === 'IDLE';
  const timer = useDurationTimer(counter.serviceStartedAt, isServing);

  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 flex flex-col gap-3',
      isServing && 'border-green-200 dark:border-green-800',
      counter.status === 'BREAK' && 'border-amber-200 dark:border-amber-800',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{counter.name}</span>
          <span className={cn('px-1.5 py-0.5 text-[10px] rounded-full font-medium', typeBadgeColors[counter.type])}>
            {counter.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', statusDotColors[counter.status])} />
          <span className="text-xs text-muted-foreground capitalize">
            {counter.status === 'SERVING' ? 'Serving' : counter.status === 'IDLE' ? 'Idle' : 'On Break'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {getInitials(counter.staffName)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{counter.staffName}</div>
          <div className="text-xs text-muted-foreground">{counter.type === 'TELLER' ? 'Teller' : counter.type === 'CSO' ? 'Customer Service Officer' : 'Branch Manager'}</div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 px-3 py-2 min-h-[52px] flex flex-col justify-center">
        {isServing ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Now Serving</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{timer}</span>
              </div>
            </div>
            <div className="text-base font-bold text-primary mt-0.5">{counter.currentTicket}</div>
            <div className="text-xs text-muted-foreground truncate">{counter.currentService}</div>
          </>
        ) : counter.status === 'BREAK' ? (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Coffee className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">On Break</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">Idle — ready to serve</div>
        )}
      </div>

      {(isIdle || isServing) && (
        <button
          type="button"
          onClick={onCallNext}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Call Next
        </button>
      )}
    </div>
  );
}
