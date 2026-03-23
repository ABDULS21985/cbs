import { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart3, Globe, Building2, Plus, X, Loader2,
  FileText, Calendar, ArrowUpRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useMarketAnalysis,
  useCreateAnalysis,
  usePublishAnalysis,
} from '../hooks/useMarketData';
import type { MarketAnalysis, AnalysisType } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  TECHNICAL: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: TrendingUp },
  FUNDAMENTAL: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: BarChart3 },
  SECTOR: { color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: Building2 },
  MACRO: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Globe },
};

const ALL_TYPES: AnalysisType[] = ['TECHNICAL', 'FUNDAMENTAL', 'SECTOR', 'MACRO'];

// ── Create Analysis Dialog ───────────────────────────────────────────────────

function CreateAnalysisDialog({ onClose }: { onClose: () => void }) {
  const createMut = useCreateAnalysis();
  const [form, setForm] = useState({
    title: '', type: 'TECHNICAL' as AnalysisType, instrument: '', sector: '', summary: '',
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="create-analysis-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="create-analysis-title" className="text-base font-semibold">New Market Analysis</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fc} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Analysis Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AnalysisType })} className={fc}>
              <option value="TECHNICAL">Technical</option><option value="FUNDAMENTAL">Fundamental</option>
              <option value="SECTOR">Sector</option><option value="MACRO">Macro</option>
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Instrument Code</label><input value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })} className={cn(fc, 'font-mono')} placeholder="e.g. NGSE:GTCO" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Sector</label><input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className={fc} placeholder="e.g. Banking" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Summary *</label>
              <span className="text-[10px] text-muted-foreground">{form.summary.length}/2000</span>
            </div>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={6} maxLength={2000} className={fc} />
          </div>
          <p className="text-[10px] text-muted-foreground">Analysis will be saved as DRAFT. You can publish it later.</p>
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button onClick={() => createMut.mutate(form, { onSuccess: () => { toast.success('Analysis created as draft'); onClose(); }, onError: () => toast.error('Failed to create') })}
              disabled={!form.title || !form.summary || createMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analysis Card ────────────────────────────────────────────────────────────

function AnalysisCard({ analysis }: { analysis: MarketAnalysis }) {
  const [expanded, setExpanded] = useState(false);
  const publishMut = usePublishAnalysis();
  const config = TYPE_CONFIG[analysis.type] ?? TYPE_CONFIG.TECHNICAL;
  const Icon = config.icon;

  return (
    <div className="surface-card overflow-hidden hover:border-border/80 transition-colors">
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
            <Icon className={cn('w-5 h-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{analysis.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.bg, config.color)}>{analysis.type}</span>
              {analysis.instrument && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{analysis.instrument}</span>}
              {analysis.sector && <span className="text-xs text-muted-foreground">{analysis.sector}</span>}
              <StatusBadge status={analysis.status} size="sm" dot />
            </div>
          </div>
        </div>

        <p className={cn('text-sm text-muted-foreground', !expanded && 'line-clamp-3')}>{analysis.summary}</p>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {analysis.publishedAt ? `Published ${formatDate(analysis.publishedAt)}` : formatDate(analysis.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            {analysis.status === 'DRAFT' && analysis.code && (
              <button onClick={() => publishMut.mutate(analysis.code!, { onSuccess: () => toast.success('Analysis published'), onError: () => toast.error('Publish failed') })}
                disabled={publishMut.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border text-green-700 hover:bg-green-50 disabled:opacity-50">
                <ArrowUpRight className="w-3 h-3" /> Publish
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Read More</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function AnalysisPage() {
  useEffect(() => { document.title = 'Market Analysis | CBS'; }, []);

  const [typeFilter, setTypeFilter] = useState<AnalysisType | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch all types for count badges, and filtered for display
  const { data: allAnalysis = [], isLoading: allLoading } = useMarketAnalysis();
  const { data: technicalData = [] } = useMarketAnalysis('TECHNICAL');
  const { data: fundamentalData = [] } = useMarketAnalysis('FUNDAMENTAL');
  const { data: sectorData = [] } = useMarketAnalysis('SECTOR');
  const { data: macroData = [] } = useMarketAnalysis('MACRO');

  const { data: filteredAnalysis = [], isLoading: filteredLoading } = useMarketAnalysis(typeFilter);

  const displayData = typeFilter ? filteredAnalysis : allAnalysis;
  const isLoading = typeFilter ? filteredLoading : allLoading;

  const typeCounts: Record<string, number> = {
    TECHNICAL: technicalData.length,
    FUNDAMENTAL: fundamentalData.length,
    SECTOR: sectorData.length,
    MACRO: macroData.length,
  };

  const publishedCount = displayData.filter((a) => a.status === 'PUBLISHED').length;
  const draftCount = displayData.filter((a) => a.status === 'DRAFT').length;

  return (
    <>
      {showCreate && <CreateAnalysisDialog onClose={() => setShowCreate(false)} />}

      <PageHeader
        title="Market Analysis"
        subtitle="Technical, fundamental, sector & macro analysis"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Analysis
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Analyses" value={allAnalysis.length} format="number" icon={FileText} loading={allLoading} />
          <StatCard label="Published" value={publishedCount} format="number" icon={ArrowUpRight} loading={isLoading} />
          <StatCard label="Drafts" value={draftCount} format="number" icon={FileText} loading={isLoading} />
          <StatCard label="Types" value={ALL_TYPES.length} format="number" icon={BarChart3} />
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTypeFilter(undefined)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              !typeFilter ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
            ALL ({allAnalysis.length})
          </button>
          {ALL_TYPES.map((type) => {
            const cfg = TYPE_CONFIG[type];
            const count = typeCounts[type] ?? 0;
            return (
              <button key={type} onClick={() => setTypeFilter(type)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  typeFilter === type ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                {type} ({count})
              </button>
            );
          })}
        </div>

        {/* Analysis cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : displayData.length === 0 ? (
          <div className="rounded-lg border p-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No analyses found</p>
            <p className="text-xs mt-1">{typeFilter ? `No ${typeFilter.toLowerCase()} analyses yet.` : 'Create your first analysis to get started.'}</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-primary hover:underline">Create new analysis</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayData.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
