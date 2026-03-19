import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileCheck, CreditCard, Landmark, ArrowRight, Loader2 } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApprovalItem {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  urgent: boolean;
  path: string;
}

const typeIcons: Record<string, typeof Clock> = { LOAN: Landmark, PAYMENT: FileCheck, ACCOUNT: Landmark, CARD: CreditCard };

export function PendingApprovalsWidget() {
  const navigate = useNavigate();

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'pending-approvals'],
    queryFn: () => apiGet<ApprovalItem[]>('/api/v1/approvals/pending'),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (approvals.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No pending approvals</p>;

  return (
    <div className="divide-y">
      {approvals.map((item) => {
        const Icon = typeIcons[item.type] || Clock;
        return (
          <button key={item.id} onClick={() => navigate(item.path)} className="flex items-center gap-3 w-full py-2.5 px-1 text-left hover:bg-muted/30 transition-colors">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', item.urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30')}>
              <Icon className={cn('w-4 h-4', item.urgent ? 'text-red-600' : 'text-blue-600')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0"><p className="text-xs text-muted-foreground">{formatRelative(item.time)}</p></div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
