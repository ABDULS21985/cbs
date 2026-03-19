import { Building2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { CashPool, CashPoolParticipant } from '../../api/cashPoolApi';

interface PoolStructureTreeProps {
  pool: CashPool;
  participants: CashPoolParticipant[];
  onParticipantClick?: (participantId: number) => void;
}

const SWEEP_DIR_LABELS: Record<string, string> = {
  BIDIRECTIONAL: 'Bidirectional',
  INWARD: 'Inward',
  OUTWARD: 'Outward',
  CONCENTRATE: 'Concentrate',
  DISTRIBUTE: 'Distribute',
};

const SWEEP_DIR_COLORS: Record<string, string> = {
  BIDIRECTIONAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INWARD: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  OUTWARD: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CONCENTRATE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DISTRIBUTE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function PoolStructureTree({ pool, participants, onParticipantClick }: PoolStructureTreeProps) {
  const activeParticipants = participants.filter((p) => p.isActive && p.participantRole !== 'HEADER');
  const inactiveParticipants = participants.filter((p) => !p.isActive);

  return (
    <div className="space-y-0">
      {/* Header account */}
      <div className="flex justify-center">
        <div className="rounded-xl border-2 border-primary bg-primary/5 px-5 py-4 w-80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-0.5">
                Header Account
              </div>
              <div className="text-sm font-semibold truncate">{pool.poolName}</div>
              <div className="font-mono text-xs text-muted-foreground">ID: {pool.headerAccountId}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-primary/20">
            <div className="text-xs text-muted-foreground">Pool Type</div>
            <div className="text-sm font-semibold text-primary">{pool.poolType.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>

      {/* Trunk line */}
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Branch root */}
      {activeParticipants.length > 0 && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-3xl">
            {/* Horizontal connector */}
            {activeParticipants.length > 1 && (
              <div
                className="absolute top-0 left-1/4 right-1/4 h-px bg-border"
                style={{
                  left: `${100 / activeParticipants.length / 2}%`,
                  right: `${100 / activeParticipants.length / 2}%`,
                }}
              />
            )}

            {/* Participants grid */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(activeParticipants.length, 3)}, 1fr)`,
              }}
            >
              {activeParticipants.map((participant) => (
                <div key={participant.id} className="flex flex-col items-center">
                  {/* Vertical connector to branch */}
                  <div className="w-px h-6 bg-border" />

                  {/* Participant card */}
                  <button
                    onClick={() => onParticipantClick?.(participant.id)}
                    disabled={!onParticipantClick}
                    className={cn(
                      'w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all',
                      !participant.isActive && 'opacity-50',
                      onParticipantClick &&
                        'hover:border-primary/50 hover:shadow-md hover:bg-primary/5 cursor-pointer',
                      !onParticipantClick && 'cursor-default',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                            SWEEP_DIR_COLORS[participant.sweepDirection] || 'bg-gray-100 text-gray-600',
                          )}
                        >
                          {SWEEP_DIR_LABELS[participant.sweepDirection] || participant.sweepDirection}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                            participant.isActive
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          {participant.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm font-medium truncate">{participant.participantName}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      Account: {participant.accountId}
                    </div>

                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">Target Balance</div>
                      <div className="text-sm font-semibold font-mono tabular-nums">
                        {formatMoneyCompact(participant.targetBalance)}
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Priority: {participant.priority}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t">
        <div className="flex-1 min-w-[140px] rounded-lg bg-muted/50 px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Pool Type</div>
          <div className="text-base font-semibold">{pool.poolType.replace(/_/g, ' ')}</div>
        </div>
        <div className="flex-1 min-w-[140px] rounded-lg bg-muted/50 px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Sweep Frequency</div>
          <div className="text-base font-semibold">{pool.sweepFrequency.replace(/_/g, ' ')}</div>
        </div>
        <div className="flex-1 min-w-[140px] rounded-lg bg-muted/50 px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Active Participants</div>
          <div className="text-base font-semibold">
            {activeParticipants.length}
            {inactiveParticipants.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                (+{inactiveParticipants.length} inactive)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
