import { useState, useEffect } from 'react';
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
  useRegisterFeed,
  usePublishResearch,
  useCreateAnalysis,
} from '../hooks/useMarketDataManagement';
import type {
  DataFeed,
  FeedQualityMetric,
  MarketSignal,
  ResearchReport,
  MarketAnalysis,
  AnalysisType,
  FeedType,
  Recommendation,
} from '../api/marketDataManagementApi';
import { formatDate, formatDateTime } from '@/lib/formatters';
import {
  Activity,
  Radio,
  Zap,
  AlertTriangle,
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Feed Status Helpers ──────────────────────────────────────────────────────

function FeedStatusDot({ status }: { status: string }) {
  const color =
    status === 'ACTIVE'
      ? 'bg-green-500'
      : status === 'STALE'
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      <span
        className={cn(
          'text-xs font-medium',
          status === 'ACTIVE'
            ? 'text-green-700'
            : status === 'STALE'
              ? 'text-amber-700'
              : 'text-red-700',
        )}
      >
        {status}
      </span>
    </span>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const cls =
    signal === 'BUY'
      ? 'bg-green-50 text-green-700 border-green-200'
      : signal === 'SELL'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold border', cls)}>
      {signal}
    </span>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  const cls =
    rec === 'BUY'
      ? 'bg-green-50 text-green-700'
      : rec === 'SELL'
        ? 'bg-red-50 text-red-700'
        : 'bg-amber-50 text-amber-700';
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cls)}>
      {rec}
    </span>
  );
}

// ─── Register Feed Dialog ─────────────────────────────────────────────────────

function RegisterFeedDialog({ onClose }: { onClose: () => void }) {
  const registerFeed = useRegisterFeed();
  const [form, setForm] = useState({
    provider: '',
    assetClass: '',
    feedType: 'REALTIME' as FeedType,
    instrumentsRaw: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const instruments = form.instrumentsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    registerFeed.mutate(
      { provider: form.provider, assetClass: form.assetClass, feedType: form.feedType, instruments },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Register Data Feed</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Provider</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="e.g. Bloomberg, Reuters"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Asset Class</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.assetClass}
              onChange={(e) => setForm((f) => ({ ...f, assetClass: e.target.value }))}
              placeholder="e.g. EQUITIES, FX, FIXED_INCOME"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Feed Type</label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.feedType}
              onChange={(e) => setForm((f) => ({ ...f, feedType: e.target.value as FeedType }))}
            >
              <option value="REALTIME">Real-time</option>
              <option value="EOD">End of Day</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Instruments (comma-separated)
            </label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.instrumentsRaw}
              onChange={(e) => setForm((f) => ({ ...f, instrumentsRaw: e.target.value }))}
              placeholder="DANGCEM, GTCO, ZENITH"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerFeed.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {registerFeed.isPending ? 'Registering…' : 'Register Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Publish Research Dialog ──────────────────────────────────────────────────

function PublishResearchDialog({ onClose }: { onClose: () => void }) {
  const publishResearch = usePublishResearch();
  const [form, setForm] = useState({
    title: '',
    instrumentCode: '',
    analyst: '',
    recommendation: 'HOLD' as Recommendation,
    targetPrice: '',
    summary: '',
    reportUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishResearch.mutate(
      {
        ...form,
        targetPrice: parseFloat(form.targetPrice) || 0,
        reportUrl: form.reportUrl || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Publish Research Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Instrument Code</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.instrumentCode}
                onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))}
                placeholder="e.g. DANGCEM"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Analyst</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.analyst}
                onChange={(e) => setForm((f) => ({ ...f, analyst: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Recommendation</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.recommendation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recommendation: e.target.value as Recommendation }))
                }
              >
                <option value="BUY">BUY</option>
                <option value="HOLD">HOLD</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Target Price</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.targetPrice}
                onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea
              rows={3}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Report URL (optional)
            </label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.reportUrl}
              onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={publishResearch.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {publishResearch.isPending ? 'Publishing…' : 'Publish'}
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
  const [form, setForm] = useState({
    title: '',
    type: 'TECHNICAL' as AnalysisType,
    instrument: '',
    sector: '',
    summary: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnalysis.mutate(
      {
        ...form,
        instrument: form.instrument || undefined,
        sector: form.sector || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New Market Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Analysis Type</label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnalysisType }))}
            >
              <option value="TECHNICAL">Technical</option>
              <option value="FUNDAMENTAL">Fundamental</option>
              <option value="SECTOR">Sector</option>
              <option value="MACRO">Macro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Instrument (optional)
              </label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.instrument}
                onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                placeholder="e.g. DANGCEM"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Sector (optional)
              </label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="e.g. Banking, Oil & Gas"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea
              rows={3}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAnalysis.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {createAnalysis.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Column Definitions ───────────────────────────────────────────────────────

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
      row.original.lastReceivedAt ? formatDateTime(row.original.lastReceivedAt) : '—',
  },
  {
    accessorKey: 'latencyMs',
    header: 'Latency (ms)',
    cell: ({ row }) =>
      row.original.latencyMs !== undefined ? (
        <span className="font-mono text-xs">{row.original.latencyMs}</span>
      ) : (
        '—'
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
    cell: ({ row }) => row.original.analyst ?? '—',
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
        '—'
      ),
  },
  {
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ row }) => row.original.sector ?? '—',
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

  const { data: price, isLoading: priceLoading } = useInstrumentPrices(activeCode);
  const { data: signals = [], isLoading: signalsLoading } = useMarketSignals(activeCode);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveCode(search.trim().toUpperCase());
  };

  const changePct = price?.changePct ?? 0;
  const isUp = changePct > 0;
  const isDown = changePct < 0;

  return (
    <div className="p-4 space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Instrument code (e.g. DANGCEM)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <div>
          {priceLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
              Loading prices…
            </div>
          ) : price ? (
            <div className="border rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-mono">{price.instrumentCode}</div>
                  {price.instrumentName && (
                    <div className="font-semibold text-lg">{price.instrumentName}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {isUp ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : isDown ? (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground',
                    )}
                  >
                    {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Bid', value: price.bid },
                  { label: 'Ask', value: price.ask },
                  { label: 'Last', value: price.last },
                  { label: 'Volume', value: price.volume },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="font-mono font-semibold text-sm">
                      {value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {price.source && (
                <div className="text-xs text-muted-foreground">
                  Source: {price.source} · {formatDateTime(price.recordedAt)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No price data for <span className="font-mono">{activeCode}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {activeCode ? `Signals — ${activeCode}` : 'Market Signals'}
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
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {TYPES.map(({ label, value }) => (
            <button
              key={value}
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

  // Connection status indicator
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
          )}>
            <span className={cn('w-2 h-2 rounded-full',
              connectionStatus === 'live' ? 'bg-green-500 animate-pulse' :
              connectionStatus === 'updating' ? 'bg-amber-500' : 'bg-red-500',
            )} />
            {connectionStatus === 'live' ? 'Live — refreshes every 60s' :
             connectionStatus === 'updating' ? 'Updating...' : 'Disconnected'}
          </span>
        }
      />
      <div className="page-container space-y-6">
        {/* Error banner */}
        {dashError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-400">Unable to load market data. Check connectivity.</p>
            </div>
            <button onClick={() => dashRefetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Switch Dashboard Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Feeds"
            value={dashboard?.totalFeeds ?? 0}
            format="number"
            icon={Radio}
            loading={dashLoading}
          />
          <StatCard
            label="Active Feeds"
            value={dashboard?.activeFeeds ?? 0}
            format="number"
            icon={Activity}
            loading={dashLoading}
          />
          <StatCard
            label="Messages / sec"
            value={dashboard?.messagesPerSec ?? 0}
            icon={Zap}
            loading={dashLoading}
          />
          <StatCard
            label="Error Rate"
            value={dashboard?.errorRate ?? 0}
            format="percent"
            icon={AlertTriangle}
            loading={dashLoading}
          />
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
