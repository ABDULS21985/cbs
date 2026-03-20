import { Users, Briefcase } from 'lucide-react';
import type { WealthAdvisor } from '../../api/wealthApi';

interface Props {
  advisor: WealthAdvisor;
  onClick?: () => void;
}

export function AdvisorCard({ advisor, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="card p-5 text-left w-full hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm">{advisor.advisorId}</p>
          <p className="text-xs text-muted-foreground">Wealth Advisor</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Active Clients</p>
          <p className="font-semibold">{advisor.activeClients}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Plans</p>
          <p className="font-semibold">{advisor.totalPlans}</p>
        </div>
      </div>
    </button>
  );
}
