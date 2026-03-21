import { useNavigate } from 'react-router-dom';
import { useApprovalStats } from '../hooks/useDashboardData';
import { Loader2, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ApprovalStatsWidget() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useApprovalStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[120px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground text-center py-6">Unable to load approval stats</p>;
  }

  const items = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', ring: 'ring-amber-200 dark:ring-amber-800/30' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'ring-emerald-200 dark:ring-emerald-800/30' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', ring: 'ring-red-200 dark:ring-red-800/30' },
    { label: 'SLA Breached', value: stats.slaBreachedCount, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', ring: 'ring-red-200 dark:ring-red-800/30' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={cn('flex items-center gap-3 p-3 rounded-xl border', item.bg, 'border-transparent')}>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-white dark:bg-white/10 shadow-sm')}>
                <Icon className={cn('w-4.5 h-4.5', item.color)} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs pt-2 border-t">
        <span className="text-muted-foreground font-medium">Total: {stats.total} approvals</span>
        <button
          onClick={() => navigate('/operations/approvals')}
          className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
