import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { Zap, LayoutGrid, Table2, BarChart3, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCapitalMarketsPipeline,
  usePrivatePlacements,
} from '../hooks/useCapitalMarkets';
import {
  KanbanBoard,
  PipelineStatsRow,
  DealFilters,
  useDealFilters,
  applyFilters,
  DealQuickCreate,
  PlacementTracker,
  PipelineAnalytics,
  DealPipelineTable,
} from '../components/pipeline';

// ── Kanban Tab ──────────────────────────────────────────────────────────────

function KanbanTab({ deals, loading }: { deals: any[]; loading: boolean }) {
  return <KanbanBoard deals={deals} loading={loading} />;
}

// ── Table Tab ───────────────────────────────────────────────────────────────

function TableTab({ deals, loading }: { deals: any[]; loading: boolean }) {
  return <DealPipelineTable deals={deals} isLoading={loading} />;
}

// ── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab({ deals }: { deals: any[] }) {
  return <PipelineAnalytics deals={deals} />;
}

// ── Placements Tab ──────────────────────────────────────────────────────────

function PlacementsTab() {
  const { data: placements = [], isLoading } = usePrivatePlacements();
  return <PlacementTracker placements={placements} loading={isLoading} />;
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function CapitalMarketsDashboardPage() {
  useEffect(() => { document.title = 'Capital Markets | CBS'; }, []);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [filters, setFilters] = useDealFilters();

  const { data: pipeline = [], isLoading: pipelineLoading } = useCapitalMarketsPipeline();

  // Apply filters
  const filtered = applyFilters(pipeline, filters);

  // Ctrl+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickCreate(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const tabs = [
    {
      id: 'kanban',
      label: 'Kanban',
      icon: LayoutGrid,
      content: <KanbanTab deals={filtered} loading={pipelineLoading} />,
    },
    {
      id: 'table',
      label: 'Table',
      icon: Table2,
      content: <TableTab deals={filtered} loading={pipelineLoading} />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      content: <AnalyticsTab deals={pipeline} />,
    },
    {
      id: 'placements',
      label: 'Placements',
      icon: Handshake,
      content: <PlacementsTab />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Capital Markets"
        subtitle="ECM/DCM deal pipeline, book building, allotments & private placements"
        actions={
          <button
            onClick={() => setShowQuickCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Quick Deal
            <kbd className="ml-1 text-[10px] px-1 py-0.5 rounded border border-primary-foreground/30 bg-primary-foreground/10">⌘K</kbd>
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats Row */}
        <PipelineStatsRow deals={pipeline} />

        {/* Filter Bar */}
        <div className="rounded-xl border bg-card p-3">
          <DealFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Tabs: Kanban / Table / Analytics / Placements */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl defaultTab="kanban" tabs={tabs} />
        </div>
      </div>

      {/* Quick Create Command Palette */}
      <DealQuickCreate open={showQuickCreate} onClose={() => setShowQuickCreate(false)} />
    </>
  );
}
