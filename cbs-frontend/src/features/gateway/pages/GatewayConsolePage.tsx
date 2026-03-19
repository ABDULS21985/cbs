import * as Tabs from '@radix-ui/react-tabs';
import { AlertOctagon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared';
import { GatewayLiveStats } from '../components/GatewayLiveStats';
import { ThroughputChart } from '../components/ThroughputChart';
import { MessageQueueTable } from '../components/MessageQueueTable';
import { FailedRetryTable } from '../components/FailedRetryTable';
import { GatewayStatusGrid } from '../components/GatewayStatusGrid';
import { SwiftMessageSearch } from '../components/SwiftMessageSearch';
import { cn } from '@/lib/utils';

const TABS = [
  { value: 'queue', label: 'Message Queue' },
  { value: 'failed', label: 'Failed / Retry' },
  { value: 'exceptions', label: 'Exceptions' },
  { value: 'status', label: 'Gateway Status' },
  { value: 'swift', label: 'SWIFT Messages' },
];

export function GatewayConsolePage() {
  return (
    <>
      <PageHeader
        title="Financial Gateway Console"
        subtitle="Real-time monitoring and management of payment gateway messages"
      />

      <div className="page-container space-y-4">
        <GatewayLiveStats />
        <ThroughputChart />

        <Tabs.Root defaultValue="queue" className="space-y-4">
          <Tabs.List className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
            {TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                )}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="queue" className="focus-visible:outline-none">
            <MessageQueueTable />
          </Tabs.Content>

          <Tabs.Content value="failed" className="focus-visible:outline-none">
            <FailedRetryTable />
          </Tabs.Content>

          <Tabs.Content value="exceptions" className="focus-visible:outline-none">
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={AlertOctagon}
                title="No exceptions to review"
                description="Exception handling for unroutable or schema-invalid messages will appear here. No active exceptions at this time."
              />
            </div>
          </Tabs.Content>

          <Tabs.Content value="status" className="focus-visible:outline-none">
            <GatewayStatusGrid />
          </Tabs.Content>

          <Tabs.Content value="swift" className="focus-visible:outline-none">
            <SwiftMessageSearch />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </>
  );
}
