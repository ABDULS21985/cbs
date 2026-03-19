import { AlertTriangle, CheckCircle, Clock, Users, XCircle } from 'lucide-react';

interface ApprovalStats {
  myPending: number;
  teamPending: number;
  slaBreached: number;
  approvedToday: number;
  rejectedToday: number;
}

interface ApprovalStatsCardsProps {
  stats: ApprovalStats;
}

export function ApprovalStatsCards({ stats }: ApprovalStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 px-6 mb-6">
      {/* My Pending */}
      <div className="stat-card border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-1">
          <div className="stat-label">My Pending</div>
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
        <div className="stat-value text-blue-600 dark:text-blue-400">{stats.myPending}</div>
        <div className="text-xs text-muted-foreground mt-1">Awaiting your action</div>
      </div>

      {/* Team Pending */}
      <div className="stat-card border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between mb-1">
          <div className="stat-label">Team Queue</div>
          <Users className="w-4 h-4 text-purple-500" />
        </div>
        <div className="stat-value text-purple-600 dark:text-purple-400">{stats.teamPending}</div>
        <div className="text-xs text-muted-foreground mt-1">Across all approvers</div>
      </div>

      {/* SLA Breached */}
      <div className="stat-card border-l-4 border-l-red-500">
        <div className="flex items-center justify-between mb-1">
          <div className="stat-label">SLA Breached</div>
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div className="stat-value text-red-600 dark:text-red-400">{stats.slaBreached}</div>
        <div className="text-xs text-muted-foreground mt-1">Needs immediate attention</div>
      </div>

      {/* Approved Today */}
      <div className="stat-card border-l-4 border-l-green-500">
        <div className="flex items-center justify-between mb-1">
          <div className="stat-label">Approved Today</div>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
        <div className="stat-value text-green-600 dark:text-green-400">{stats.approvedToday}</div>
        <div className="text-xs text-muted-foreground mt-1">Since midnight</div>
      </div>

      {/* Rejected Today */}
      <div className="stat-card border-l-4 border-l-rose-400">
        <div className="flex items-center justify-between mb-1">
          <div className="stat-label">Rejected Today</div>
          <XCircle className="w-4 h-4 text-rose-400" />
        </div>
        <div className="stat-value text-rose-500 dark:text-rose-400">{stats.rejectedToday}</div>
        <div className="text-xs text-muted-foreground mt-1">Since midnight</div>
      </div>
    </div>
  );
}
