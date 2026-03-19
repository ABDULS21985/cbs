import { useNavigate } from 'react-router-dom';
import { Clock, FileCheck, CreditCard, Landmark, ArrowRight } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const mockApprovals = [
  { id: 1, type: 'LOAN', title: 'Loan Application #LA-0234', subtitle: '₦5,000,000 - Personal Loan', time: new Date(Date.now() - 30 * 60000).toISOString(), urgent: true, path: '/lending/applications' },
  { id: 2, type: 'PAYMENT', title: 'Bulk Payment Batch #BP-089', subtitle: '₦12,500,000 - 45 items', time: new Date(Date.now() - 2 * 3600000).toISOString(), urgent: false, path: '/payments/bulk' },
  { id: 3, type: 'ACCOUNT', title: 'Account Opening - Dangote Ltd', subtitle: 'Corporate Current Account', time: new Date(Date.now() - 4 * 3600000).toISOString(), urgent: false, path: '/accounts' },
  { id: 4, type: 'CARD', title: 'Card Request #CR-567', subtitle: 'Platinum Credit Card', time: new Date(Date.now() - 8 * 3600000).toISOString(), urgent: false, path: '/cards' },
];

const typeIcons: Record<string, typeof Clock> = { LOAN: Landmark, PAYMENT: FileCheck, ACCOUNT: Landmark, CARD: CreditCard };

export function PendingApprovalsWidget() {
  const navigate = useNavigate();
  return (
    <div className="divide-y">
      {mockApprovals.map((item) => {
        const Icon = typeIcons[item.type] || Clock;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 w-full py-2.5 px-1 text-left hover:bg-muted/30 transition-colors"
          >
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', item.urgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30')}>
              <Icon className={cn('w-4 h-4', item.urgent ? 'text-red-600' : 'text-blue-600')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground">{formatRelative(item.time)}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
