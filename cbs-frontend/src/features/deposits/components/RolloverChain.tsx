import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import { fixedDepositApi, type FixedDeposit } from '../api/fixedDepositApi';

interface RolloverChainProps {
  currentFd: FixedDeposit;
}

export function RolloverChain({ currentFd }: RolloverChainProps) {
  const navigate = useNavigate();

  const { data: customerFds = [] } = useQuery({
    queryKey: ['fixed-deposits', 'customer', currentFd.customerId],
    queryFn: () => fixedDepositApi.getCustomerFds(currentFd.customerId),
    enabled: !!currentFd.customerId,
  });

  // Build chain from parentFdId links
  const chain: FixedDeposit[] = [];
  const fdMap = new Map(customerFds.map((fd) => [fd.id, fd]));

  // Walk backward to find root
  let root = currentFd;
  while (root.parentFdId && fdMap.has(root.parentFdId)) {
    root = fdMap.get(root.parentFdId)!;
  }

  // Walk forward from root
  let cursor: FixedDeposit | undefined = root;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor.id)) {
    chain.push(cursor);
    visited.add(cursor.id);
    cursor = customerFds.find((fd) => fd.parentFdId === cursor!.id);
  }

  // If no chain found beyond current, add just current
  if (chain.length === 0) chain.push(currentFd);

  if (chain.length <= 1) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        No rollover history — this is the original deposit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{chain.length} deposits in rollover chain</p>
      <div className="flex items-start gap-2 overflow-x-auto pb-2">
        {chain.map((fd, i) => {
          const isCurrent = fd.id === currentFd.id;
          return (
            <div key={fd.id} className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => !isCurrent && navigate(`/accounts/fixed-deposits/${fd.id}`)}
                disabled={isCurrent}
                className={cn(
                  'rounded-xl border-2 p-4 w-56 text-left transition-all',
                  isCurrent ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50 hover:shadow-sm cursor-pointer',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-medium">{fd.fdNumber}</span>
                  <StatusBadge status={fd.status} size="sm" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-mono font-medium">{formatMoney(fd.principalAmount, fd.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-mono">{fd.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenor</span>
                    <span>{fd.tenor}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start</span>
                    <span>{formatDate(fd.startDate)}</span>
                  </div>
                </div>
                {isCurrent && (
                  <div className="mt-2 text-[10px] font-medium text-primary text-center">CURRENT</div>
                )}
              </button>
              {i < chain.length - 1 && (
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
