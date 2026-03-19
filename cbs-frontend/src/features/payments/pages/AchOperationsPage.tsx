import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
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
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ACH Operations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage ACH batch payments, inbound entries, returns, and settlement
        </p>
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
