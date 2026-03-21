import { useNavigate } from 'react-router-dom';
import { useApprovalStats } from '../hooks/useDashboardData';
import { Loader2, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'SLA Breached', value: stats.slaBreachedCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg border">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', item.bg)}>
                <Icon className={cn('w-4 h-4', item.color)} />
              </div>
              <div>
                <p className="text-lg font-semibold leading-none">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span>Total: {stats.total} approvals</span>
        <button
          onClick={() => navigate('/operations/approvals')}
          className="text-primary hover:underline"
        >
          View All →
        </button>
      </div>
    </div>
  );
}
