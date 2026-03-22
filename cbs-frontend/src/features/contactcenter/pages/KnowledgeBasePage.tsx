import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, FileText, BookOpen, ThumbsUp, ThumbsDown,
  Eye, X, Loader2, Check, Play, Zap, ChevronRight,
  CreditCard, Landmark, Banknote, Shield, HelpCircle, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useSearchHelpArticles,
  useCreateHelpArticle,
  usePublishHelpArticle,
  useRecordArticleView,
  useRecordArticleHelpfulness,
  useGuidedFlows,
  useCreateGuidedFlow,
  useActivateGuidedFlow,
  useStartGuidedFlow,
} from '../hooks/useContactCenter';
import type { HelpArticle, GuidedFlow } from '../types/help';

// ─── Debounce Hook ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Category Definitions ───────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Account Services', icon: Landmark, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { name: 'Card Services', icon: CreditCard, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { name: 'Lending', icon: Banknote, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { name: 'Payments', icon: Zap, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { name: 'Compliance', icon: Shield, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { name: 'General', icon: HelpCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
];

// ─── Article Card ───────────────────────────────────────────────────────────

function ArticleCard({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  const helpfulPct = (article.helpfulnessYes + article.helpfulnessNo) > 0
    ? Math.round((article.helpfulnessYes / (article.helpfulnessYes + article.helpfulnessNo)) * 100)
    : 0;
  const tags = Array.isArray(article.tags) ? article.tags : typeof article.tags === 'object' && article.tags ? Object.values(article.tags) : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{article.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {article.category} {article.viewCount > 0 && `· ${article.viewCount.toLocaleString()} views`}
          </p>
          {article.summary && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{article.summary}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {tags.slice(0, 5).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">{String(tag)}</span>
            ))}
            {helpfulPct > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <ThumbsUp className="w-3 h-3" /> {helpfulPct}% helpful
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Article Slide-over ─────────────────────────────────────────────────────

function ArticleSlideOver({ article, onClose }: { article: HelpArticle; onClose: () => void }) {
  const recordView = useRecordArticleView();
  const recordHelpfulness = useRecordArticleHelpfulness();

  useEffect(() => {
    recordView.mutate(article.articleCode);
  }, [article.articleCode]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-background shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold truncate">{article.title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <StatusBadge status={article.status} />
            <span>{article.category}</span>
            <span>{article.language}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.viewCount}</span>
            {article.publishedAt && <span>Published: {formatDate(article.publishedAt)}</span>}
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {article.content ? (
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            ) : (
              <p className="text-muted-foreground italic">No content available</p>
            )}
          </div>

          {/* Helpfulness */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Was this article helpful?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { recordHelpfulness.mutate({ code: article.articleCode, helpful: true }); toast.success('Thanks for your feedback!'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
              >
                <ThumbsUp className="w-4 h-4 text-green-600" /> Yes
              </button>
              <button
                onClick={() => { recordHelpfulness.mutate({ code: article.articleCode, helpful: false }); toast.info('Thank you — we\'ll improve this article'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <ThumbsDown className="w-4 h-4 text-red-600" /> No
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Article Modal ───────────────────────────────────────────────────

function CreateArticleModal({ onClose }: { onClose: () => void }) {
  const createArticle = useCreateHelpArticle();
  const [form, setForm] = useState({
    title: '', category: 'General', articleType: 'HOW_TO', content: '', summary: '',
    tags: '', productFamily: '', language: 'en',
  });

  const handleSubmit = (publish: boolean) => {
    const tagsObj = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    createArticle.mutate({
      title: form.title, category: form.category, articleType: form.articleType,
      content: form.content, summary: form.summary, tags: tagsObj as unknown as Record<string, unknown>,
      productFamily: form.productFamily, language: form.language,
      status: publish ? 'PUBLISHED' : 'DRAFT',
    } as Partial<HelpArticle>, {
      onSuccess: () => { toast.success(publish ? 'Article published' : 'Draft saved'); onClose(); },
      onError: () => toast.error('Failed to create article'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create Article</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <input className="w-full mt-1 input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <select className="w-full mt-1 input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Article Type</label>
              <select className="w-full mt-1 input" value={form.articleType} onChange={(e) => setForm((f) => ({ ...f, articleType: e.target.value }))}>
                <option value="HOW_TO">How-To</option>
                <option value="FAQ">FAQ</option>
                <option value="POLICY">Policy</option>
                <option value="TROUBLESHOOT">Troubleshoot</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Language</label>
              <select className="w-full mt-1 input" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="ha">Hausa</option>
                <option value="yo">Yoruba</option>
                <option value="ig">Igbo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Summary</label>
            <input className="w-full mt-1 input" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Content</label>
            <textarea className="w-full mt-1 input h-32 resize-y" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tags (comma-separated)</label>
            <input className="w-full mt-1 input" placeholder="chargeback, dispute, cards" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Product Family</label>
            <input className="w-full mt-1 input" value={form.productFamily} onChange={(e) => setForm((f) => ({ ...f, productFamily: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => handleSubmit(false)} disabled={!form.title || createArticle.isPending} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Save Draft</button>
            <button onClick={() => handleSubmit(true)} disabled={!form.title || createArticle.isPending} className="btn-primary">
              {createArticle.isPending ? 'Saving...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Flow Modal ──────────────────────────────────────────────────────

function CreateFlowModal({ onClose }: { onClose: () => void }) {
  const createFlow = useCreateGuidedFlow();
  const [form, setForm] = useState({ flowName: '', flowType: 'TROUBLESHOOT', description: '', estimatedDurationMin: 5, targetChannel: 'CHAT' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFlow.mutate(form as Partial<GuidedFlow>, {
      onSuccess: () => { toast.success('Guided flow created'); onClose(); },
      onError: () => toast.error('Failed'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create Guided Flow</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Flow Name</label>
            <input className="w-full mt-1 input" value={form.flowName} onChange={(e) => setForm((f) => ({ ...f, flowName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select className="w-full mt-1 input" value={form.flowType} onChange={(e) => setForm((f) => ({ ...f, flowType: e.target.value }))}>
                <option value="TROUBLESHOOT">Troubleshoot</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="VERIFICATION">Verification</option>
                <option value="COMPLAINT">Complaint</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Channel</label>
              <select className="w-full mt-1 input" value={form.targetChannel} onChange={(e) => setForm((f) => ({ ...f, targetChannel: e.target.value }))}>
                <option value="CHAT">Chat</option>
                <option value="PHONE">Phone</option>
                <option value="EMAIL">Email</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 input h-16 resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Est. Duration (minutes)</label>
            <input type="number" className="w-full mt-1 input" value={form.estimatedDurationMin} onChange={(e) => setForm((f) => ({ ...f, estimatedDurationMin: parseInt(e.target.value) || 5 }))} min={1} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.flowName || createFlow.isPending} className="btn-primary">
              {createFlow.isPending ? 'Creating...' : 'Create Flow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function KnowledgeBasePage() {
  useEffect(() => { document.title = 'Knowledge Base | CBS'; }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showCreateArticle, setShowCreateArticle] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchParams = debouncedQuery ? { q: debouncedQuery } : categoryFilter ? { category: categoryFilter } : undefined;
  const { data: articles = [], isLoading } = useSearchHelpArticles(searchParams);
  const publishArticle = usePublishHelpArticle();
  const activateFlow = useActivateGuidedFlow();
  const startFlow = useStartGuidedFlow();

  const { data: flows = [] } = useGuidedFlows();

  const articleCols: ColumnDef<HelpArticle, unknown>[] = [
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="font-medium text-sm">{row.original.title}</span> },
    { accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="text-xs">{row.original.category}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'viewCount', header: 'Views', cell: ({ row }) => <span className="text-xs font-mono">{row.original.viewCount.toLocaleString()}</span> },
    {
      id: 'helpfulness', header: 'Helpful %',
      cell: ({ row }) => {
        const total = row.original.helpfulnessYes + row.original.helpfulnessNo;
        const pct = total > 0 ? Math.round((row.original.helpfulnessYes / total) * 100) : 0;
        return <span className={cn('text-xs font-mono', pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600')}>{pct}%</span>;
      },
    },
    { accessorKey: 'language', header: 'Language', cell: ({ row }) => <span className="text-xs uppercase">{row.original.language}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.status === 'DRAFT' ? (
        <button
          onClick={(e) => { e.stopPropagation(); publishArticle.mutate(row.original.articleCode, { onSuccess: () => toast.success('Article published') }); }}
          className="text-xs text-primary hover:underline font-medium"
        >
          Publish
        </button>
      ) : null,
    },
  ];

  const showSearch = searchQuery.length > 0;
  const showCategories = !showSearch && !categoryFilter;

  const tabs = [
    {
      id: 'browse',
      label: 'Browse',
      content: (
        <div className="p-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCategoryFilter(''); }}
              placeholder="Search articles, FAQs, and guides..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Category filter breadcrumb */}
          {categoryFilter && (
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setCategoryFilter('')} className="text-primary hover:underline">All Categories</button>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{categoryFilter}</span>
            </div>
          )}

          {/* Category grid */}
          {showCategories && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const count = articles.filter((a) => a.category === cat.name).length;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setCategoryFilter(cat.name)}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all text-left"
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', cat.color)}>
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{count} articles</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results */}
          {(showSearch || categoryFilter) && (
            articles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                ))}
              </div>
            ) : !isLoading ? (
              <EmptyState title="No articles found" description={showSearch ? `No results for "${searchQuery}"` : `No articles in ${categoryFilter}`} />
            ) : null
          )}
        </div>
      ),
    },
    {
      id: 'manage',
      label: 'Article Management',
      badge: articles.filter((a) => a.status === 'DRAFT').length || undefined,
      content: (
        <div className="p-4">
          <DataTable
            columns={articleCols}
            data={articles}
            isLoading={isLoading}
            enableGlobalFilter
            enableExport
            exportFilename="knowledge-base-articles"
            emptyMessage="No articles yet"
            onRowClick={(row) => setSelectedArticle(row)}
          />
        </div>
      ),
    },
    {
      id: 'flows',
      label: 'Guided Flows',
      content: (
        <div className="p-4">
          {flows.length > 0 ? (
            <div className="space-y-3">
              {flows.map((flow) => (
                <div key={flow.id} className="rounded-xl border bg-card p-5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{flow.flowName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {flow.flowType} · {flow.estimatedDurationMin}min · {flow.targetChannel}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Starts: {flow.totalStarts}</span>
                      <span>Completions: {flow.totalCompletions}</span>
                      <span>Rate: {flow.completionRatePct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={flow.status} dot />
                    {flow.status !== 'ACTIVE' && (
                      <button
                        onClick={() => activateFlow.mutate(flow.flowCode, { onSuccess: () => toast.success('Flow activated') })}
                        className="text-xs px-3 py-1 rounded-lg border text-primary hover:bg-primary/5 font-medium"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => startFlow.mutate(flow.flowCode, { onSuccess: () => toast.info('Flow test started') })}
                      className="text-xs px-3 py-1 rounded-lg border hover:bg-muted font-medium"
                    >
                      <Play className="w-3 h-3 inline mr-1" /> Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No guided flows" description="Create your first guided flow to help agents resolve issues." />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {selectedArticle && <ArticleSlideOver article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
      {showCreateArticle && <CreateArticleModal onClose={() => setShowCreateArticle(false)} />}
      {showCreateFlow && <CreateFlowModal onClose={() => setShowCreateFlow(false)} />}

      <PageHeader
        title="Knowledge Base"
        subtitle="Internal help articles, FAQs, and guided flows for agents"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCreateFlow(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              <BookOpen className="w-4 h-4" /> New Flow
            </button>
            <button onClick={() => setShowCreateArticle(true)} className="flex items-center gap-2 btn-primary">
              <Plus className="w-4 h-4" /> New Article
            </button>
          </div>
        }
      />

      <div className="page-container">
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
