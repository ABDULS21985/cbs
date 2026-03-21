import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as Tabs from '@radix-ui/react-tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { MaturityGapTable } from '../components/alm/MaturityGapTable';
import { GapChart } from '../components/alm/GapChart';
import { DurationSummaryCard } from '../components/alm/DurationSummaryCard';
import { DurationTrendChart } from '../components/alm/DurationTrendChart';
import { NiiSensitivityTable } from '../components/alm/NiiSensitivityTable';
import { NiiSensitivityChart } from '../components/alm/NiiSensitivityChart';
import { FxExposureTable } from '../components/alm/FxExposureTable';
import { FxPnlChart } from '../components/alm/FxPnlChart';
import { LiquidityRatioCards } from '../components/alm/LiquidityRatioCards';
import { RateOutlookPanel } from '../components/alm/RateOutlookPanel';

const TABS = [
  { id: 'gap', label: 'Gap Analysis' },
  { id: 'duration', label: 'Duration' },
  { id: 'nii', label: 'NII Sensitivity' },
  { id: 'fx', label: 'FX Exposure' },
  { id: 'liquidity', label: 'Liquidity' },
  { id: 'rates', label: 'Rate Outlook' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function TreasuryAlmReportsPage() {
  useEffect(() => { document.title = 'Treasury & ALM Reports | CBS'; }, []);
  const [activeTab, setActiveTab] = useState<TabId>('gap');
  const [asOfDate, setAsOfDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  return (
    <>
      <PageHeader
        title="Treasury & ALM Reports"
        subtitle="Asset-Liability Management — Interest Rate, Liquidity & FX Risk"
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="page-asofdate" className="text-xs text-muted-foreground whitespace-nowrap">
              As of Date:
            </label>
            <input
              id="page-asofdate"
              type="date"
              value={asOfDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        }
      />

      <div className="page-container">
        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <Tabs.List className="flex items-center gap-0.5 border-b mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors focus-visible:outline-none',
                  'text-muted-foreground hover:text-foreground border-transparent',
                  activeTab === tab.id && 'text-primary border-primary',
                )}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="gap" className="space-y-6 focus-visible:outline-none">
            <MaturityGapTable asOfDate={asOfDate} onAsOfDateChange={setAsOfDate} />
            <GapChart asOfDate={asOfDate} />
          </Tabs.Content>

          <Tabs.Content value="duration" className="space-y-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DurationSummaryCard asOfDate={asOfDate} />
              <DurationTrendChart months={12} />
            </div>
          </Tabs.Content>

          <Tabs.Content value="nii" className="space-y-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NiiSensitivityTable asOfDate={asOfDate} />
              <NiiSensitivityChart asOfDate={asOfDate} />
            </div>
          </Tabs.Content>

          <Tabs.Content value="fx" className="space-y-6 focus-visible:outline-none">
            <FxExposureTable asOfDate={asOfDate} />
            <FxPnlChart asOfDate={asOfDate} />
          </Tabs.Content>

          <Tabs.Content value="liquidity" className="focus-visible:outline-none">
            <LiquidityRatioCards asOfDate={asOfDate} />
          </Tabs.Content>

          <Tabs.Content value="rates" className="focus-visible:outline-none">
            <RateOutlookPanel />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </>
  );
}
