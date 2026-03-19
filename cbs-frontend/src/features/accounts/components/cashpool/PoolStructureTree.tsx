import { Building2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { CashPool } from '../../api/cashPoolApi';

interface PoolStructureTreeProps {
  pool: CashPool;
  onParticipantClick?: (participantId: string) => void;
}

const SWEEP_TYPE_LABELS: Record<string, string> = {
  ZBA: 'Zero Balance',
  THRESHOLD: 'Threshold',
  TARGET_BALANCE: 'Target Balance',
};

const SWEEP_TYPE_COLORS: Record<string, string> = {
  ZBA: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  THRESHOLD: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TARGET_BALANCE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function PoolStructureTree({ pool, onParticipantClick }: PoolStructureTreeProps) {
  const activeParticipants = pool.participants.filter((p) => p.status === 'ACTIVE');
  const inactiveParticipants = pool.participants.filter((p) => p.status === 'INACTIVE');

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
              <div className="text-sm font-semibold truncate">{pool.headerAccount.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{pool.headerAccount.number}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-primary/20">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-primary">
              {formatMoney(pool.headerAccount.balance)}
            </div>
          </div>
        </div>
      </div>

      {/* Trunk line */}
      <div className="flex justify-center">
        <div className="w-px h-6 bg-border" />
      </div>

      {/* Branch root */}
      {pool.participants.length > 0 && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-3xl">
            {/* Horizontal connector */}
            {pool.participants.length > 1 && (
              <div
                className="absolute top-0 left-1/4 right-1/4 h-px bg-border"
                style={{
                  left: `${100 / pool.participants.length / 2}%`,
                  right: `${100 / pool.participants.length / 2}%`,
                }}
              />
            )}

            {/* Participants grid */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(pool.participants.length, 3)}, 1fr)`,
              }}
            >
              {pool.participants.map((participant, idx) => (
                <div key={participant.id} className="flex flex-col items-center">
                  {/* Vertical connector to branch */}
                  <div className="w-px h-6 bg-border" />

                  {/* Participant card */}
                  <button
                    onClick={() => onParticipantClick?.(participant.id)}
                    disabled={!onParticipantClick}
                    className={cn(
                      'w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all',
                      participant.status === 'INACTIVE' && 'opacity-50',
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
                            SWEEP_TYPE_COLORS[participant.sweepType],
                          )}
                        >
                          {SWEEP_TYPE_LABELS[participant.sweepType]}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                            participant.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          {participant.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm font-medium truncate">{participant.accountName}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {participant.accountNumber}
                    </div>

                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">Balance</div>
                      <div className="text-sm font-semibold font-mono tabular-nums">
                        {formatMoneyCompact(participant.balance)}
                      </div>
                    </div>

                    {participant.sweepType === 'THRESHOLD' && participant.sweepThreshold !== undefined && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Threshold: {formatMoneyCompact(participant.sweepThreshold)}
                      </div>
                    )}
                    {participant.sweepType === 'TARGET_BALANCE' && participant.targetBalance !== undefined && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Target: {formatMoneyCompact(participant.targetBalance)}
                      </div>
                    )}
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
          <div className="text-xs text-muted-foreground mb-1">Total Pool Balance</div>
          <div className="text-base font-semibold font-mono tabular-nums">
            {formatMoney(pool.totalBalance)}
          </div>
        </div>
        <div className="flex-1 min-w-[140px] rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-3">
          <div className="text-xs text-green-700 dark:text-green-400 mb-1">Monthly Interest Benefit</div>
          <div className="text-base font-semibold font-mono tabular-nums text-green-700 dark:text-green-400">
            +{formatMoney(pool.interestBenefit)}
          </div>
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
