import { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import {
  useFeedStatus,
  useSwitchDashboard,
  useFeedQualityMetrics,
  useInstrumentPrices,
  useMarketSignals,
  usePublishedResearch,
  useMarketAnalysis,
  usePublishResearch,
  useCreateAnalysis,
} from '../hooks/useMarketData';
import type {
  DataFeed,
  FeedQualityMetric,
  MarketSignal,
  ResearchReport,
  MarketAnalysis,
  AnalysisType,
  Recommendation,
} from '../types';
import { formatDate, formatDateTime } from '@/lib/formatters';
import {
  Activity,
  Radio,
  Zap,
  AlertTriangle,
  Search,
  Plus,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FeedStatusDot } from '../components/FeedStatusDot';
import { SignalBadge } from '../components/SignalBadge';
import { RegisterFeedDialog } from '../components/RegisterFeedDialog';
import { PriceCard } from '../components/PriceCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function RecommendationBadge({ rec }: { rec: string }) {
  const cls =
    rec === 'BUY'
      ? 'bg-green-50 text-green-700'
      : rec === 'SELL'
        ? 'bg-red-50 text-red-700'
        : 'bg-amber-50 text-amber-700';
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cls)} aria-label={`Recommendation: ${rec}`}>
      {rec}
    </span>
  );
}

// ─── Publish Research Dialog ──────────────────────────────────────────────────

function PublishResearchDialog({ onClose }: { onClose: () => void }) {
  const publishResearch = usePublishResearch();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    instrumentCode: '',
    analyst: '',
    recommendation: 'HOLD' as Recommendation,
    targetPrice: '',
    summary: '',
    reportUrl: '',
  });

  useEffect(() => { firstInputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishResearch.mutate(
      {
        ...form,
        targetPrice: parseFloat(form.targetPrice) || 0,
        reportUrl: form.reportUrl || undefined,
      },
      { onSuccess: () => { toast.success('Research published'); onClose(); }, onError: () => toast.error('Failed to publish research') },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="pub-research-title">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close dialog">
          <X className="w-4 h-4" />
        </button>
        <h2 id="pub-research-title" className="text-lg font-semibold mb-4">Publish Research Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pr-title" className="text-sm font-medium text-muted-foreground">Title</label>
            <input id="pr-title" ref={firstInputRef} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-instrument" className="text-sm font-medium text-muted-foreground">Instrument Code</label>
              <input id="pr-instrument" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} placeholder="e.g. DANGCEM" required />
            </div>
            <div>
              <label htmlFor="pr-analyst" className="text-sm font-medium text-muted-foreground">Analyst</label>
              <input id="pr-analyst" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.analyst} onChange={(e) => setForm((f) => ({ ...f, analyst: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-rec" className="text-sm font-medium text-muted-foreground">Recommendation</label>
              <select id="pr-rec" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value as Recommendation }))}>
                <option value="BUY">BUY</option>
                <option value="HOLD">HOLD</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label htmlFor="pr-target" className="text-sm font-medium text-muted-foreground">Target Price</label>
              <input id="pr-target" type="number" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.targetPrice} onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label htmlFor="pr-summary" className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea id="pr-summary" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
          </div>
          <div>
            <label htmlFor="pr-url" className="text-sm font-medium text-muted-foreground">Report URL (optional)</label>
            <input id="pr-url" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.reportUrl} onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={publishResearch.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {publishResearch.isPending ? 'Publishing\u2026' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New Analysis Dialog ──────────────────────────────────────────────────────

function NewAnalysisDialog({ onClose }: { onClose: () => void }) {
  const createAnalysis = useCreateAnalysis();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    type: 'TECHNICAL' as AnalysisType,
    instrument: '',
    sector: '',
    summary: '',
  });

  useEffect(() => { firstInputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnalysis.mutate(
      { ...form, instrument: form.instrument || undefined, sector: form.sector || undefined },
      { onSuccess: () => { toast.success('Analysis created'); onClose(); }, onError: () => toast.error('Failed to create analysis') },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="new-analysis-title">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close dialog"><X className="w-4 h-4" /></button>
        <h2 id="new-analysis-title" className="text-lg font-semibold mb-4">New Market Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="na-title" className="text-sm font-medium text-muted-foreground">Title</label>
            <input id="na-title" ref={firstInputRef} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label htmlFor="na-type" className="text-sm font-medium text-muted-foreground">Analysis Type</label>
            <select id="na-type" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnalysisType }))}>
              <option value="TECHNICAL">Technical</option>
              <option value="FUNDAMENTAL">Fundamental</option>
              <option value="SECTOR">Sector</option>
              <option value="MACRO">Macro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="na-instrument" className="text-sm font-medium text-muted-foreground">Instrument (optional)</label>
              <input id="na-instrument" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="e.g. DANGCEM" />
            </div>
            <div>
              <label htmlFor="na-sector" className="text-sm font-medium text-muted-foreground">Sector (optional)</label>
              <input id="na-sector" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} placeholder="e.g. Banking, Oil & Gas" />
            </div>
          </div>
          <div>
            <label htmlFor="na-summary" className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea id="na-summary" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createAnalysis.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createAnalysis.isPending ? 'Creating\u2026' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Column Definitions (stable module-level references) ─────────────────────

const feedCols: ColumnDef<DataFeed, unknown>[] = [
  {
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.provider}</span>,
  },
  { accessorKey: 'assetClass', header: 'Asset Class' },
  {
    accessorKey: 'feedType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.feedType} />,
  },
  {
    accessorKey: 'lastReceivedAt',
    header: 'Last Received',
    cell: ({ row }) =>
      row.original.lastReceivedAt ? formatDateTime(row.original.lastReceivedAt) : '\u2014',
  },
  {
    accessorKey: 'latencyMs',
    header: 'Latency (ms)',
    cell: ({ row }) =>
      row.original.latencyMs !== undefined ? (
        <span className="font-mono text-xs">{row.original.latencyMs}</span>
      ) : (
        '\u2014'
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <FeedStatusDot status={row.original.status} />,
  },
];

const qualityCols: ColumnDef<FeedQualityMetric, unknown>[] = [
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'assetClass', header: 'Asset Class' },
  {
    accessorKey: 'completeness',
    header: 'Completeness',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.completeness}%</span>,
  },
  {
    accessorKey: 'accuracy',
    header: 'Accuracy',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.accuracy}%</span>,
  },
  {
    accessorKey: 'timeliness',
    header: 'Timeliness',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.timeliness}%</span>,
  },
  {
    accessorKey: 'errorCount',
    header: 'Errors',
    cell: ({ row }) => (
      <span
        className={cn(
          'font-mono text-sm',
          row.original.errorCount > 10 ? 'text-red-600' : 'text-foreground',
        )}
      >
        {row.original.errorCount}
      </span>
    ),
  },
  {
    accessorKey: 'overallScore',
    header: 'Score',
    cell: ({ row }) => {
      const score = row.original.overallScore;
      const color =
        score >= 90 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-red-600';
      return <span className={cn('font-semibold font-mono text-sm', color)}>{score}</span>;
    },
  },
];

const signalCols: ColumnDef<MarketSignal, unknown>[] = [
  {
    accessorKey: 'instrumentCode',
    header: 'Instrument',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.instrumentCode}</span>
    ),
  },
  {
    accessorKey: 'signal',
    header: 'Signal',
    cell: ({ row }) => <SignalBadge signal={row.original.signal} />,
  },
  {
    accessorKey: 'confidence',
    header: 'Confidence',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${row.original.confidence}%` }}
          />
        </div>
        <span className="text-xs font-mono">{row.original.confidence}%</span>
      </div>
    ),
  },
  { accessorKey: 'source', header: 'Source' },
  {
    accessorKey: 'analyst',
    header: 'Analyst',
    cell: ({ row }) => row.original.analyst ?? '\u2014',
  },
  {
    accessorKey: 'generatedAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.generatedAt),
  },
];

const researchCols: ColumnDef<ResearchReport, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <span className="font-medium text-sm max-w-[200px] truncate block">{row.original.title}</span>
    ),
  },
  { accessorKey: 'analyst', header: 'Analyst' },
  {
    accessorKey: 'recommendation',
    header: 'Recommendation',
    cell: ({ row }) => <RecommendationBadge rec={row.original.recommendation} />,
  },
  {
    accessorKey: 'instrumentCode',
    header: 'Instrument',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.instrumentCode}</span>
    ),
  },
  {
    accessorKey: 'targetPrice',
    header: 'Target Price',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.targetPrice.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'publishedAt',
    header: 'Published',
    cell: ({ row }) => formatDate(row.original.publishedAt),
  },
];

const analysisCols: ColumnDef<MarketAnalysis, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.title}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.type} />,
  },
  {
    accessorKey: 'instrument',
    header: 'Instrument',
    cell: ({ row }) =>
      row.original.instrument ? (
        <span className="font-mono text-xs text-primary">{row.original.instrument}</span>
      ) : (
        '\u2014'
      ),
  },
  {
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ row }) => row.original.sector ?? '\u2014',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

// ─── Sub-Tab Components ───────────────────────────────────────────────────────

function DataFeedsTab() {
  const [showRegister, setShowRegister] = useState(false);
  const { data: feeds = [], isLoading: feedsLoading } = useFeedStatus();
  const { data: quality = [], isLoading: qualityLoading } = useFeedQualityMetrics();

  return (
    <div className="p-4 space-y-6">
      {showRegister && <RegisterFeedDialog onClose={() => setShowRegister(false)} />}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Feed Status
        </h3>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Register Feed
        </button>
      </div>
      <DataTable
        columns={feedCols}
        data={feeds}
        isLoading={feedsLoading}
        enableGlobalFilter
        emptyMessage="No data feeds registered"
      />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Feed Quality Metrics
        </h3>
        <DataTable
          columns={qualityCols}
          data={quality}
          isLoading={qualityLoading}
          emptyMessage="No quality metrics available"
        />
      </div>
    </div>
  );
}

function PricesSignalsTab() {
  const [search, setSearch] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: price, isLoading: priceLoading } = useInstrumentPrices(activeCode);
  const { data: signals = [], isLoading: signalsLoading } = useMarketSignals(activeCode);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim().toUpperCase();
      if (trimmed) setActiveCode(trimmed);
    }, 300);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    setActiveCode(search.trim().toUpperCase());
  };

  return (
    <div className="p-4 space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Instrument code (e.g. DANGCEM)"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search instrument code"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Lookup
        </button>
      </form>

      {activeCode && (
        <div aria-live="polite">
          {priceLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              Loading prices&hellip;
            </div>
          ) : price ? (
            <PriceCard price={price} />
          ) : (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No price data for <span className="font-mono">{activeCode}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {activeCode ? `Signals \u2014 ${activeCode}` : 'Market Signals'}
        </h3>
        <DataTable
          columns={signalCols}
          data={signals}
          isLoading={signalsLoading}
          emptyMessage={activeCode ? 'No signals for this instrument' : 'Enter an instrument code to view signals'}
        />
      </div>
    </div>
  );
}

function ResearchTab() {
  const [showPublish, setShowPublish] = useState(false);
  const { data: reports = [], isLoading } = usePublishedResearch();

  return (
    <div className="p-4 space-y-4">
      {showPublish && <PublishResearchDialog onClose={() => setShowPublish(false)} />}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Published Research
        </h3>
        <button
          onClick={() => setShowPublish(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Publish Research
        </button>
      </div>
      <DataTable
        columns={researchCols}
        data={reports}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="research-reports"
        emptyMessage="No published research reports"
      />
    </div>
  );
}

function AnalysisTab() {
  const [showNew, setShowNew] = useState(false);
  const [activeType, setActiveType] = useState<AnalysisType>('TECHNICAL');
  const { data: analyses = [], isLoading } = useMarketAnalysis(activeType);

  const TYPES: { label: string; value: AnalysisType }[] = [
    { label: 'Technical', value: 'TECHNICAL' },
    { label: 'Fundamental', value: 'FUNDAMENTAL' },
    { label: 'Sector', value: 'SECTOR' },
    { label: 'Macro', value: 'MACRO' },
  ];

  return (
    <div className="p-4 space-y-4">
      {showNew && <NewAnalysisDialog onClose={() => setShowNew(false)} />}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-lg" role="tablist" aria-label="Analysis type filter">
          {TYPES.map(({ label, value }) => (
            <button
              key={value}
              role="tab"
              aria-selected={activeType === value}
              onClick={() => setActiveType(value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeType === value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> New Analysis
        </button>
      </div>
      <DataTable
        columns={analysisCols}
        data={analyses}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No analysis reports for this type"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MarketDataManagementPage() {
  useEffect(() => { document.title = 'Market Data Infrastructure | CBS'; }, []);

  const { data: dashboard, isLoading: dashLoading, isError: dashError, isFetching: dashFetching, refetch: dashRefetch } = useSwitchDashboard();

  const connectionStatus = dashError ? 'disconnected' : dashFetching ? 'updating' : 'live';

  return (
    <>
      <PageHeader
        title="Market Data Infrastructure"
        subtitle="Manage data feeds, prices, signals, and research publications"
        actions={
          <span className={cn('flex items-center gap-1.5 text-xs font-medium',
            connectionStatus === 'live' ? 'text-green-600' :
            connectionStatus === 'updating' ? 'text-amber-600' : 'text-red-600',
          )} aria-live="polite">
            <span className={cn('w-2 h-2 rounded-full',
              connectionStatus === 'live' ? 'bg-green-500 animate-pulse' :
              connectionStatus === 'updating' ? 'bg-amber-500' : 'bg-red-500',
            )} aria-hidden="true" />
            {connectionStatus === 'live' ? 'Live \u2014 refreshes every 60s' :
             connectionStatus === 'updating' ? 'Updating...' : 'Disconnected'}
          </span>
        }
      />
      <div className="page-container space-y-6">
        {dashError && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden="true" />
              <p className="text-sm text-red-700 dark:text-red-400">Unable to load market data. Check connectivity.</p>
            </div>
            <button onClick={() => dashRefetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
          <StatCard label="Total Feeds" value={dashboard?.totalFeeds ?? 0} format="number" icon={Radio} loading={dashLoading} />
          <StatCard label="Active Feeds" value={dashboard?.activeFeeds ?? 0} format="number" icon={Activity} loading={dashLoading} />
          <StatCard label="Messages / sec" value={dashboard?.messagesPerSec ?? 0} icon={Zap} loading={dashLoading} />
          <StatCard label="Error Rate" value={dashboard?.errorRate ?? 0} format="percent" icon={AlertTriangle} loading={dashLoading} />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'feeds', label: 'Data Feeds', content: <DataFeedsTab /> },
            { id: 'prices', label: 'Prices & Signals', content: <PricesSignalsTab /> },
            { id: 'research', label: 'Research', content: <ResearchTab /> },
            { id: 'analysis', label: 'Analysis', content: <AnalysisTab /> },
          ]}
        />
      </div>
    </>
  );
}
