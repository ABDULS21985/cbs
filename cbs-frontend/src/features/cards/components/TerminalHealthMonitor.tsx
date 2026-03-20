import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import type { PosTerminal } from '../types/posTerminal';

interface TerminalHealthMonitorProps {
  terminals: PosTerminal[];
  isLoading: boolean;
}

function getStatus(terminal: PosTerminal): 'online' | 'idle' | 'offline' {
  if (!terminal.lastHeartbeatAt) return 'offline';
  const minutesAgo = (Date.now() - new Date(terminal.lastHeartbeatAt).getTime()) / 60_000;
  if (minutesAgo < 5) return 'online';
  if (minutesAgo < 30) return 'idle';
  return 'offline';
}

const statusColors = {
  online: 'bg-green-500',
  idle: 'bg-amber-500',
  offline: 'bg-red-500',
};

export function TerminalHealthMonitor({ terminals, isLoading }: TerminalHealthMonitorProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-muted animate-pulse" />;
  }

  if (terminals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
        No terminals to monitor
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Terminal Health Grid</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Idle (&gt;5min)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Offline (&gt;30min)
          </span>
          <span className="text-[10px]">Auto-refresh: 30s</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {terminals.map((t) => {
          const status = getStatus(t);
          return (
            <div
              key={t.id}
              className="group relative cursor-pointer"
              onClick={() => navigate(`/cards/pos/${t.terminalId}`)}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full transition-transform hover:scale-150',
                  statusColors[status],
                  status === 'online' && 'animate-pulse',
                )}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48">
                <div className="bg-popover border rounded-lg shadow-lg p-2.5 text-xs">
                  <p className="font-mono font-medium">{t.terminalId}</p>
                  <p className="text-muted-foreground">{t.merchantName}</p>
                  <p className="text-muted-foreground mt-1">
                    Heartbeat: {t.lastHeartbeatAt ? formatRelative(t.lastHeartbeatAt) : 'Never'}
                  </p>
                  <p className="text-muted-foreground">Txns today: {t.transactionsToday}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { getStatus };
