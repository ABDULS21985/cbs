import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { Settings2, ToggleLeft, BarChart3, List, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parameterApi } from '../api/parameterApi';
import { ParameterTable } from '../components/parameters/ParameterTable';
import { FeatureFlagToggles } from '../components/parameters/FeatureFlagToggles';
import { RateTableEditor } from '../components/parameters/RateTableEditor';
import { LookupCodeManager } from '../components/parameters/LookupCodeManager';
import { SystemInfoPanel } from '../components/parameters/SystemInfoPanel';

const TABS = [
  { id: 'parameters', label: 'Parameters', icon: Settings2 },
  { id: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { id: 'rate-tables', label: 'Rate Tables', icon: BarChart3 },
  { id: 'lookup-codes', label: 'Lookup Codes', icon: List },
  { id: 'system-info', label: 'System Info', icon: Server },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function SystemParametersPage() {
  const [activeTab, setActiveTab] = useState<TabId>('parameters');

  const { data: rateTables = [] } = useQuery({
    queryKey: ['rate-tables'],
    queryFn: () => parameterApi.getRateTables(),
    enabled: activeTab === 'rate-tables',
  });

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b bg-card flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold">System Parameters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure system-wide parameters, feature flags, rate tables, and lookup codes
          </p>
        </div>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="flex flex-col flex-1 min-h-0"
      >
        <Tabs.List className="flex items-center gap-0 px-6 border-b bg-card flex-shrink-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  'hover:text-foreground',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto">
          <Tabs.Content value="parameters" className="p-6 focus:outline-none">
            <ParameterTable />
          </Tabs.Content>

          <Tabs.Content value="feature-flags" className="p-6 focus:outline-none">
            <FeatureFlagToggles />
          </Tabs.Content>

          <Tabs.Content value="rate-tables" className="p-6 focus:outline-none">
            <RateTableEditor rateTables={rateTables} />
          </Tabs.Content>

          <Tabs.Content value="lookup-codes" className="p-6 focus:outline-none">
            <LookupCodeManager />
          </Tabs.Content>

          <Tabs.Content value="system-info" className="p-6 focus:outline-none">
            <SystemInfoPanel />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
