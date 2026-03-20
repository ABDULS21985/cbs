import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { Send, Download, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/shared';
import { achApi } from '../api/achApi';
import { AchBatchTable } from '../components/ach/AchBatchTable';
import { AchReturnTable } from '../components/ach/AchReturnTable';
import { AchSettlementSummary } from '../components/ach/AchSettlementSummary';

const TABS = [
  { id: 'outbound', label: 'Outbound Batches' },
  { id: 'inbound', label: 'Inbound Batches' },
  { id: 'returns', label: 'Returns' },
  { id: 'settlement', label: 'Settlement' },
];

export default function AchOperationsPage() {
  useEffect(() => { document.title = 'ACH Operations | CBS'; }, []);

  const { data: outbound = [], isLoading: outLoading } = useQuery({
    queryKey: ['ach-batches', 'outbound'],
    queryFn: () => achApi.getOutboundBatches(),
  });

  const { data: inbound = [], isLoading: inLoading } = useQuery({
    queryKey: ['ach-batches', 'inbound'],
    queryFn: () => achApi.getInboundBatches(),
  });

  const { data: returns = [], isLoading: retLoading } = useQuery({
    queryKey: ['ach-returns'],
    queryFn: () => achApi.getReturns(),
  });

  const { data: settlements = [], isLoading: setLoading } = useQuery({
    queryKey: ['ach-settlement'],
    queryFn: () => achApi.getSettlementSummary(),
  });

  const statsLoading = outLoading || inLoading || retLoading || setLoading;

  const pendingSettlement = useMemo(() => {
    return settlements
      .filter((s) => s.status === 'PENDING')
      .reduce((sum, s) => sum + Math.abs(s.netPosition), 0);
  }, [settlements]);

  const returnRate = useMemo(() => {
    const totalBatches = outbound.length + inbound.length;
    if (totalBatches === 0) return 0;
    return (returns.length / totalBatches) * 100;
  }, [outbound, inbound, returns]);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ACH Operations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage ACH batch payments, inbound entries, returns, and settlement
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Outbound Batches"
          value={outbound.length}
          format="number"
          icon={Send}
          loading={statsLoading}
        />
        <StatCard
          label="Inbound Batches"
          value={inbound.length}
          format="number"
          icon={Download}
          loading={statsLoading}
        />
        <StatCard
          label="Pending Settlement"
          value={pendingSettlement}
          format="money"
          currency="USD"
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          label="Return Rate"
          value={returnRate}
          format="percent"
          icon={AlertTriangle}
          loading={statsLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="outbound">
        <Tabs.List className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all -mb-px border-b-2 border-transparent',
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400',
                'data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="outbound" className="focus:outline-none">
          <AchBatchTable mode="outbound" />
        </Tabs.Content>

        <Tabs.Content value="inbound" className="focus:outline-none">
          <AchBatchTable mode="inbound" />
        </Tabs.Content>

        <Tabs.Content value="returns" className="focus:outline-none">
          <AchReturnTable />
        </Tabs.Content>

        <Tabs.Content value="settlement" className="focus:outline-none">
          <AchSettlementSummary />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
