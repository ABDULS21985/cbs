import { useState, useEffect } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  FileText, Briefcase, TrendingUp, Lightbulb, Plus, X, Loader2,
  CheckCircle2, ExternalLink, Calendar, DollarSign, Users, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  usePublishedResearch,
  useActiveResearchProjects,
  useResearchInsights,
  usePublishResearch,
  useCompleteResearchProject,
  useCreateResearchProject,
} from '../hooks/useMarketDataManagement';
import type { ResearchReport, MarketResearchProject, Recommendation } from '../api/marketDataManagementApi';

// ── Recommendation Badge ─────────────────────────────────────────────────────

const REC_COLORS: Record<string, string> = {
  BUY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SELL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700', ACTIVE: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PROJECT_TYPE_ICONS: Record<string, React.ReactNode> = {
  CUSTOMER_SURVEY: <Users className="w-5 h-5" />,
  COMPETITIVE_ANALYSIS: <BarChart3 className="w-5 h-5" />,
  PRODUCT_STUDY: <Briefcase className="w-5 h-5" />,
  MARKET_SIZING: <TrendingUp className="w-5 h-5" />,
};

// ── Research Detail Slide-over ───────────────────────────────────────────────

function ResearchDetail({ report, onClose }: { report: ResearchReport; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Research Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <h3 className="text-lg font-semibold">{report.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">By {report.analyst} · Published {formatDate(report.publishedAt)}</p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Instrument</span>
              <span className="font-mono text-sm">{report.instrumentCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Target Price</span>
              <span className="font-mono text-sm font-bold">{formatMoney(report.targetPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recommendation</span>
              <span className={cn('px-3 py-1 rounded-full text-sm font-bold', REC_COLORS[report.recommendation])}>
                {report.recommendation}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Summary</h4>
            <p className="text-sm leading-relaxed">{report.summary}</p>
          </div>

          {report.reportUrl && (
            <a href={report.reportUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted text-sm font-medium">
              <ExternalLink className="w-4 h-4" /> Open Full Report
            </a>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Publish Research Dialog ──────────────────────────────────────────────────

function PublishResearchDialog({ onClose }: { onClose: () => void }) {
  const publishMut = usePublishResearch();
  const [form, setForm] = useState({
    title: '', instrumentCode: '', analyst: '', recommendation: 'HOLD' as Recommendation,
    targetPrice: 0, summary: '', reportUrl: '',
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">Publish Research</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button></div>
        <div className="px-6 py-5 space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fc} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Instrument Code *</label><input value={form.instrumentCode} onChange={(e) => setForm({ ...form, instrumentCode: e.target.value })} className={cn(fc, 'font-mono')} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Analyst *</label><input value={form.analyst} onChange={(e) => setForm({ ...form, analyst: e.target.value })} className={fc} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Recommendation</label>
              <select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value as Recommendation })} className={fc}>
                <option value="BUY">BUY</option><option value="HOLD">HOLD</option><option value="SELL">SELL</option>
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Target Price</label><input type="number" step="0.01" value={form.targetPrice || ''} onChange={(e) => setForm({ ...form, targetPrice: Number(e.target.value) })} className={cn(fc, 'font-mono')} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Summary *</label><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={4} className={fc} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Report URL</label><input value={form.reportUrl} onChange={(e) => setForm({ ...form, reportUrl: e.target.value })} className={fc} placeholder="https://..." /></div>
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button onClick={() => publishMut.mutate(form, { onSuccess: () => { toast.success('Research published'); onClose(); }, onError: () => toast.error('Failed to publish') })}
              disabled={!form.title || !form.instrumentCode || !form.summary || publishMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {publishMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Project Dialog ────────────────────────────────────────────────────

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const createMut = useCreateResearchProject();
  const [form, setForm] = useState({ title: '', type: 'CUSTOMER_SURVEY', description: '' });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-base font-semibold">New Research Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button></div>
        <div className="px-6 py-5 space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Project Name *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fc} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={fc}>
              <option value="CUSTOMER_SURVEY">Customer Survey</option>
              <option value="COMPETITIVE_ANALYSIS">Competitive Analysis</option>
              <option value="PRODUCT_STUDY">Product Study</option>
              <option value="MARKET_SIZING">Market Sizing</option>
            </select></div>
          <div><label className="text-xs font-medium text-muted-foreground">Description *</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={fc} /></div>
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button onClick={() => createMut.mutate(form, { onSuccess: () => { toast.success('Project created'); onClose(); }, onError: () => toast.error('Failed to create project') })}
              disabled={!form.title || !form.description || createMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ResearchPage() {
  useEffect(() => { document.title = 'Market Research | CBS'; }, []);

  const [showPublish, setShowPublish] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [recFilter, setRecFilter] = useState<string>('ALL');

  const { data: research = [], isLoading: researchLoading } = usePublishedResearch();
  const { data: projects = [], isLoading: projectsLoading } = useActiveResearchProjects();
  const { data: insights, isLoading: insightsLoading } = useResearchInsights();
  const completeMut = useCompleteResearchProject();

  const filteredResearch = recFilter === 'ALL' ? research : research.filter((r) => r.recommendation === recFilter);
  const buyCount = research.filter((r) => r.recommendation === 'BUY').length;

  const researchColumns: ColumnDef<ResearchReport, unknown>[] = [
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span> },
    { accessorKey: 'analyst', header: 'Analyst', cell: ({ row }) => <span className="text-sm">{row.original.analyst}</span> },
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{row.original.instrumentCode}</span> },
    { accessorKey: 'recommendation', header: 'Recommendation', cell: ({ row }) => (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', REC_COLORS[row.original.recommendation])}>
        {row.original.recommendation}
      </span>
    )},
    { accessorKey: 'targetPrice', header: 'Target', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.targetPrice)}</span> },
    { accessorKey: 'publishedAt', header: 'Published', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.publishedAt)}</span> },
  ];

  return (
    <>
      {showPublish && <PublishResearchDialog onClose={() => setShowPublish(false)} />}
      {showNewProject && <CreateProjectDialog onClose={() => setShowNewProject(false)} />}
      {selectedReport && <ResearchDetail report={selectedReport} onClose={() => setSelectedReport(null)} />}

      <PageHeader
        title="Market Research"
        subtitle={`${research.length} published reports`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowPublish(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><FileText className="w-4 h-4" /> Publish Research</button>
            <button onClick={() => setShowNewProject(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"><Plus className="w-4 h-4" /> New Project</button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Published Reports" value={research.length} format="number" icon={FileText} loading={researchLoading} />
          <StatCard label="Active Projects" value={projects.length} format="number" icon={Briefcase} loading={projectsLoading} />
          <StatCard label="BUY Recommendations" value={buyCount} format="number" icon={TrendingUp} loading={researchLoading} />
          <StatCard label="Research Insights" value={insights?.totalProjects ?? 0} format="number" icon={Lightbulb} loading={insightsLoading} />
        </div>

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          { id: 'published', label: 'Published Research', badge: research.length || undefined, content: (
            <div className="p-4 space-y-4">
              {/* Recommendation filter pills */}
              <div className="flex gap-2">
                {['ALL', 'BUY', 'HOLD', 'SELL'].map((rec) => (
                  <button key={rec} onClick={() => setRecFilter(rec)}
                    className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      recFilter === rec ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                    {rec}
                  </button>
                ))}
              </div>
              <DataTable
                columns={researchColumns}
                data={filteredResearch}
                isLoading={researchLoading}
                enableGlobalFilter
                enableExport
                exportFilename="market-research"
                emptyMessage="No published research"
                pageSize={15}
                onRowClick={(row: ResearchReport) => setSelectedReport(row)}
              />
            </div>
          )},
          { id: 'projects', label: 'Active Projects', badge: projects.length || undefined, content: (
            <div className="p-4">
              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border p-12 text-center text-muted-foreground">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active research projects.</p>
                  <button onClick={() => setShowNewProject(true)} className="mt-3 text-sm text-primary hover:underline">Create a new project</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project: MarketResearchProject) => (
                    <div key={project.id} className="rounded-xl border bg-card p-5 space-y-3 hover:border-border/80 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          {PROJECT_TYPE_ICONS[project.type] ?? <BarChart3 className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{project.title}</h3>
                          <p className="text-xs text-muted-foreground">{project.type.replace(/_/g, ' ')}</p>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', PROJECT_STATUS_COLORS[project.status])}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {project.status === 'ACTIVE' && (
                          <button onClick={() => completeMut.mutate({ code: project.code, findings: 'Completed', keyInsights: [], actionItems: [] }, { onSuccess: () => toast.success('Project completed') })}
                            disabled={completeMut.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border text-green-700 hover:bg-green-50">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )},
          { id: 'insights', label: 'Research Insights', content: (
            <div className="p-4">
              {insightsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
              ) : !insights ? (
                <div className="rounded-lg border p-12 text-center text-muted-foreground">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No research insights available yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{insights.totalProjects}</p>
                      <p className="text-xs text-muted-foreground">Total Projects</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{insights.completedThisMonth}</p>
                      <p className="text-xs text-muted-foreground">Completed This Month</p>
                    </div>
                  </div>

                  {insights.keyThemes && insights.keyThemes.length > 0 && (
                    <div className="rounded-lg border bg-card p-5">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Key Themes</h3>
                      <div className="space-y-2">
                        {insights.keyThemes.map((theme, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0 mt-0.5">{i + 1}</span>
                            <span>{theme}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.recommendations && insights.recommendations.length > 0 && (
                    <div className="rounded-lg border bg-card p-5">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Recommendations</h3>
                      <div className="space-y-2">
                        {insights.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )},
        ]} />
      </div>
    </>
  );
}
