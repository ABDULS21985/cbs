import {
  Phone, PhoneCall, Clock, Coffee, Radio, PhoneOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentState } from '../api/contactCenterApi';

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500', ON_CALL: 'bg-red-500', BUSY: 'bg-red-500',
  WRAP_UP: 'bg-amber-500', AFTER_CALL: 'bg-amber-500',
  BREAK: 'bg-gray-400', ON_BREAK: 'bg-gray-400',
  TRAINING: 'bg-blue-500', OFFLINE: 'bg-gray-600',
};

const STATE_ICONS: Record<string, typeof Phone> = {
  AVAILABLE: Phone, ON_CALL: PhoneCall, BUSY: PhoneCall,
  WRAP_UP: Clock, AFTER_CALL: Clock,
  BREAK: Coffee, ON_BREAK: Coffee,
  TRAINING: Radio, OFFLINE: PhoneOff,
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface AgentCardProps {
  agent: AgentState;
  onStateChange: (agentId: string, state: string) => void;
}

export function AgentCard({ agent, onStateChange }: AgentCardProps) {
  const StateIcon = STATE_ICONS[agent.state] ?? Phone;
  const stateColor = STATE_COLORS[agent.state] ?? 'bg-gray-400';

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', stateColor)}>
          <StateIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{agent.agentName}</p>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', stateColor)} />
            <span className="text-xs text-muted-foreground">{agent.state.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Handled:</span> <span className="font-mono font-medium">{agent.callsToday}</span></div>
        <div><span className="text-muted-foreground">AHT:</span> <span className="font-mono">{fmtTime(agent.avgHandleTimeSec)}</span></div>
        <div><span className="text-muted-foreground">FCR:</span> <span className={cn('font-mono font-medium', agent.fcrPct >= 80 ? 'text-green-600' : 'text-amber-600')}>{agent.fcrPct.toFixed(0)}%</span></div>
        <div><span className="text-muted-foreground">Quality:</span> <span className={cn('font-mono font-medium', agent.qualityScore >= 80 ? 'text-green-600' : 'text-amber-600')}>{agent.qualityScore}</span></div>
      </div>

      <select
        value={agent.state}
        onChange={(e) => onStateChange(agent.agentId, e.target.value)}
        className="w-full text-xs rounded-lg border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'TRAINING', 'OFFLINE'].map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>
  );
}
