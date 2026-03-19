import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Clock, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { branchOpsApi, type LiveQueue } from '../../api/branchOpsApi';
import { QueueCounter } from './QueueCounter';

interface LiveQueueStatusProps {
  branchId: string;
}

export function LiveQueueStatus({ branchId }: LiveQueueStatusProps) {
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery<LiveQueue>({
    queryKey: ['branches', branchId, 'queue', 'live'],
    queryFn: () => branchOpsApi.getLiveQueue(branchId),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'queue', 'live'] });
    }, 15_000);
    return () => clearInterval(id);
  }, [branchId, queryClient]);

  const handleCallNext = async (counterId: string, counterName: string) => {
    try {
      const ticket = await branchOpsApi.callNext(branchId, counterId);
      toast.success(`Called ${ticket.ticketNumber} to ${counterName}`);
      queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'queue', 'live'] });
    } catch {
      toast.error('Failed to call next ticket');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!queue) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {queue.counters.map((counter) => (
          <QueueCounter
            key={counter.id}
            counter={counter}
            onCallNext={() => handleCallNext(counter.id, counter.name)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Waiting:</span>
          <span className="font-semibold">{queue.waitingCount}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Longest wait:</span>
          <span className={queue.longestWaitMinutes > 15 ? 'font-semibold text-red-600' : 'font-semibold'}>
            {queue.longestWaitMinutes} min
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Next:</span>
          <span className="font-semibold font-mono">{queue.nextTicket}</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">Auto-refreshes every 15s</div>
      </div>
    </div>
  );
}
