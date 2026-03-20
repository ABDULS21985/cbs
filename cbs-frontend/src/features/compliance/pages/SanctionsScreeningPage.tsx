import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FileSearch, CheckCircle, AlertTriangle, XCircle, Eye, Clock,
  Shield, Search, Globe, Target, Filter, Database, Zap, Plus, X,
  ChevronDown, ChevronRight, Loader2, Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useSanctionsScreenings,
  useSanctionsPending,
  useSanctionsStats,
  useWatchlists,
  useBatchScreenJobs,
  useScreenName,
  useConfirmMatch,
  useFalsePositiveMatch,
  useUpdateWatchlist,
  useBatchScreen,
} from '../hooks/useSanctions';
import type {
  ScreeningRequest,
  ScreeningMatch,
  Watchlist,
  ScreenNamePayload,
  WatchlistSource,
} from '../types/sanctions';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  OFAC_SDN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UN_CONSOLIDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EU_CONSOLIDATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PEP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  UK_HMT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  LOCAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const TYPE_COLORS: Record<string, string> = {
  ONBOARDING: 'bg-blue-100 text-blue-700',
  TRANSACTION: 'bg-amber-100 text-amber-700',
  PERIODIC: 'bg-green-100 text-green-700',
  ADHOC: 'bg-gray-100 text-gray-700',
};

const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6'];

// ─── Match Score Bar ────────────────────────────────────────────────────────

function MatchScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-red-500' : score >= 70 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-mono font-bold', score >= 90 ? 'text-red-600' : score >= 70 ? 'text-amber-600' : 'text-green-600')}>
        {score}%
      </span>
    </div>
  );
}

// ─── Match Inline Card ──────────────────────────────────────────────────────

function MatchInlineCard({ match, onConfirm, onFalsePositive }: {
  match: ScreeningMatch;
  onConfirm: (id: number) => void;
  onFalsePositive: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-muted/30 border text-sm">
      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', SOURCE_COLORS[match.watchlistSource] ?? 'bg-gray-100 text-gray-700')}>
        {match.watchlistSource?.replace('_', ' ')}
      </span>
      <span className="font-medium flex-1 min-w-0 truncate">{match.watchlistName}</span>
      <MatchScoreBar score={match.matchScore} />
      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
        match.matchType === 'EXACT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
      )}>
        {match.matchType}
      </span>
      <div className="flex gap-1">
        {match.matchedFields?.map((f) => (
          <span key={f} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">{f}</span>
        ))}
      </div>
      {match.disposition === 'PENDING' ? (
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onConfirm(match.id)} className="px-2 py-1 rounded text-[10px] font-bold bg-red-600 text-white hover:bg-red-700">Confirm</button>
          <button onClick={() => onFalsePositive(match.id)} className="px-2 py-1 rounded text-[10px] font-bold bg-green-600 text-white hover:bg-green-700">False +</button>
        </div>
      ) : (
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
          match.disposition === 'TRUE_MATCH' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
        )}>
          {match.disposition === 'TRUE_MATCH' ? 'CONFIRMED' : 'FALSE POSITIVE'}
        </span>
      )}
    </div>
  );
}

// ─── Screen Name Dialog ─────────────────────────────────────────────────────

function ScreenNameDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const screenName = useScreenName();
  const [form, setForm] = useState<ScreenNamePayload>({
    subjectName: '',
    subjectType: 'INDIVIDUAL',
    screeningType: 'ADHOC',
    listsToScreen: ['OFAC_SDN', 'UN_CONSOLIDATED', 'EU_CONSOLIDATED', 'PEP'],
    matchThreshold: 85,
  });
  const [result, setResult] = useState<ScreeningRequest | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    screenName.mutate(form, {
      onSuccess: (data) => {
        setResult(data);
        if (data.status === 'CLEAR') {
          toast.success('No matches found — subject is clear');
        } else {
          toast.warning(`${data.totalMatches} potential match(es) found`);
        }
      },
      onError: () => toast.error('Screening failed'),
    });
  };

  const toggleList = (list: string) => {
    const current = form.listsToScreen ?? [];
    setForm((f) => ({
      ...f,
      listsToScreen: current.includes(list) ? current.filter((l) => l !== list) : [...current, list],
    }));
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
          {result.status === 'CLEAR' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-green-700 dark:text-green-300">No Matches Found</h3>
              <p className="text-sm text-muted-foreground">Subject is clear — screened in {result.screeningTimeMs}ms</p>
              <button onClick={onClose} className="btn-primary">Close</button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300">{result.totalMatches} Potential Match(es)</h3>
              <p className="text-sm text-muted-foreground">Review required — screened in {result.screeningTimeMs}ms</p>
              <button onClick={() => { onClose(); navigate(`/compliance/sanctions/screenings/${result.id}`); }} className="btn-primary">Review Matches</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Screen Name</h2>
        <p className="text-sm text-muted-foreground mb-4">Screen a name against sanctions and PEP watchlists</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Information</h4>
            <input className="w-full input text-lg font-medium" placeholder="Full name to screen..." value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} required autoFocus />
            <div className="flex gap-3">
              {(['INDIVIDUAL', 'COMPANY'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, subjectType: t }))}
                  className={cn('flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors',
                    form.subjectType === t ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}>
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">DOB</label>
                <input type="date" className="w-full mt-1 input text-xs" value={form.subjectDob ?? ''} onChange={(e) => setForm((f) => ({ ...f, subjectDob: e.target.value || undefined }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nationality</label>
                <input className="w-full mt-1 input text-xs" placeholder="e.g. NG" value={form.subjectNationality ?? ''} onChange={(e) => setForm((f) => ({ ...f, subjectNationality: e.target.value || undefined }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ID Number</label>
                <input className="w-full mt-1 input text-xs" value={form.subjectIdNumber ?? ''} onChange={(e) => setForm((f) => ({ ...f, subjectIdNumber: e.target.value || undefined }))} />
              </div>
            </div>
          </div>

          {/* Context */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Context</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Screening Type</label>
                <select className="w-full mt-1 input text-xs" value={form.screeningType} onChange={(e) => setForm((f) => ({ ...f, screeningType: e.target.value }))}>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="TRANSACTION">Transaction</option>
                  <option value="PERIODIC">Periodic</option>
                  <option value="ADHOC">Ad-hoc</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Customer ID</label>
                <input type="number" className="w-full mt-1 input text-xs" value={form.customerId ?? ''} onChange={(e) => setForm((f) => ({ ...f, customerId: parseInt(e.target.value) || undefined }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Transaction Ref</label>
                <input className="w-full mt-1 input text-xs" value={form.transactionRef ?? ''} onChange={(e) => setForm((f) => ({ ...f, transactionRef: e.target.value || undefined }))} />
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Screening Configuration</h4>
            <div className="flex flex-wrap gap-2">
              {(['OFAC_SDN', 'UN_CONSOLIDATED', 'EU_CONSOLIDATED', 'PEP', 'UK_HMT', 'LOCAL'] as WatchlistSource[]).map((list) => {
                const checked = form.listsToScreen?.includes(list);
                return (
                  <button key={list} type="button" onClick={() => toggleList(list)}
                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                      checked ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40',
                    )}>
                    {checked ? '✓ ' : ''}{list.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Match Threshold</label>
                <span className="text-xs font-mono font-bold text-primary">{form.matchThreshold ?? 85}%</span>
              </div>
              <input type="range" min={50} max={100} step={5} value={form.matchThreshold ?? 85}
                onChange={(e) => setForm((f) => ({ ...f, matchThreshold: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary mt-1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.subjectName.trim() || screenName.isPending} className="btn-primary flex items-center gap-2">
              {screenName.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {screenName.isPending ? 'Screening...' : 'Screen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SanctionsScreeningPage() {
  useEffect(() => { document.title = 'Sanctions Screening | CBS'; }, []);

  const navigate = useNavigate();
  const [showScreenDialog, setShowScreenDialog] = useState(false);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [batchInput, setBatchInput] = useState('');

  const { data: stats, isLoading: statsLoading } = useSanctionsStats();
  const { data: pending = [], isLoading: pendingLoading } = useSanctionsPending();
  const { data: allScreenings = [], isLoading: screeningsLoading } = useSanctionsScreenings(
    statusFilter || typeFilter ? { ...(statusFilter && { status: statusFilter }), ...(typeFilter && { screeningType: typeFilter }) } : undefined,
  );
  const { data: watchlists = [], isLoading: watchlistsLoading } = useWatchlists();
  const { data: batchJobs = [] } = useBatchScreenJobs();

  const confirmMatch = useConfirmMatch();
  const falsePositiveMatch = useFalsePositiveMatch();
  const updateWatchlist = useUpdateWatchlist();
  const batchScreen = useBatchScreen();

  const handleConfirm = (id: number) => {
    confirmMatch.mutate(id, { onSuccess: () => toast.success('Match confirmed as true hit') });
  };
  const handleFalsePositive = (id: number) => {
    falsePositiveMatch.mutate(id, { onSuccess: () => toast.success('Marked as false positive') });
  };

  // Pending review columns
  const pendingCols: ColumnDef<ScreeningRequest, unknown>[] = [
    {
      accessorKey: 'screeningRef',
      header: 'Ref',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/compliance/sanctions/screenings/${row.original.id}`)} className="font-mono text-xs font-medium text-primary hover:underline">
          {row.original.screeningRef}
        </button>
      ),
    },
    { accessorKey: 'subjectName', header: 'Subject', cell: ({ row }) => <span className="font-semibold text-sm">{row.original.subjectName}</span> },
    { accessorKey: 'subjectType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.subjectType} /> },
    {
      accessorKey: 'screeningType', header: 'Screening',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', TYPE_COLORS[row.original.screeningType] ?? '')}>{row.original.screeningType}</span>,
    },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => row.original.customerId ? <span className="text-xs">#{row.original.customerId}</span> : <span className="text-xs text-muted-foreground">—</span> },
    {
      accessorKey: 'totalMatches', header: 'Matches',
      cell: ({ row }) => <span className={cn('text-xs font-bold', row.original.totalMatches > 3 ? 'text-red-600' : '')}>{row.original.totalMatches}</span>,
    },
    { accessorKey: 'trueMatches', header: 'True', cell: ({ row }) => <span className="text-xs font-mono text-red-600">{row.original.trueMatches}</span> },
    { accessorKey: 'falsePositives', header: 'False +', cell: ({ row }) => <span className="text-xs font-mono text-green-600">{row.original.falsePositives}</span> },
    {
      id: 'pending', header: 'Pending',
      cell: ({ row }) => {
        const p = row.original.totalMatches - row.original.trueMatches - row.original.falsePositives;
        return <span className={cn('text-xs font-mono font-bold', p > 0 ? 'text-red-600' : '')}>{p}</span>;
      },
    },
    { accessorKey: 'screeningTimeMs', header: 'Time', cell: ({ row }) => <span className="text-xs font-mono">{row.original.screeningTimeMs}ms</span> },
    { accessorKey: 'createdAt', header: 'Screened', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
    {
      id: 'expand', header: '',
      cell: ({ row }) => (
        <button onClick={() => setExpandedRef((prev) => prev === row.original.screeningRef ? null : row.original.screeningRef)} className="p-1 rounded hover:bg-muted">
          {expandedRef === row.original.screeningRef ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      ),
    },
  ];

  // All screenings columns
  const allCols: ColumnDef<ScreeningRequest, unknown>[] = [
    { accessorKey: 'screeningRef', header: 'Ref', cell: ({ row }) => <button onClick={() => navigate(`/compliance/sanctions/screenings/${row.original.id}`)} className="font-mono text-xs font-medium text-primary hover:underline">{row.original.screeningRef}</button> },
    { accessorKey: 'subjectName', header: 'Subject', cell: ({ row }) => <span className="font-medium text-sm">{row.original.subjectName}</span> },
    { accessorKey: 'subjectType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.subjectType} /> },
    { accessorKey: 'screeningType', header: 'Screening', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', TYPE_COLORS[row.original.screeningType] ?? '')}>{row.original.screeningType}</span> },
    { accessorKey: 'listsScreened', header: 'Lists', cell: ({ row }) => <div className="flex gap-1 flex-wrap">{row.original.listsScreened?.map((l) => <span key={l} className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', SOURCE_COLORS[l] ?? 'bg-gray-100')}>{l.split('_')[0]}</span>)}</div> },
    { accessorKey: 'totalMatches', header: 'Matches', cell: ({ row }) => <span className="text-xs font-mono">{row.original.totalMatches}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'createdAt', header: 'Screened', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    { accessorKey: 'reviewedBy', header: 'Reviewed By', cell: ({ row }) => <span className="text-xs">{row.original.reviewedBy ?? '—'}</span> },
  ];

  // Watchlist columns
  const watchlistCols: ColumnDef<Watchlist, unknown>[] = [
    { accessorKey: 'listSource', header: 'Source', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', SOURCE_COLORS[row.original.listSource] ?? '')}>{row.original.listSource.replace('_', ' ')}</span> },
    { accessorKey: 'id', header: 'Entry ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
    { accessorKey: 'entityType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.entityType} /> },
    { accessorKey: 'primaryName', header: 'Name', cell: ({ row }) => <span className="font-semibold text-sm">{row.original.primaryName}</span> },
    { accessorKey: 'aliases', header: 'Aliases', cell: ({ row }) => <span className="text-xs">{row.original.aliases?.length ?? 0}</span> },
    { accessorKey: 'nationality', header: 'Nationality', cell: ({ row }) => <span className="text-xs">{row.original.nationality ?? '—'}</span> },
    { accessorKey: 'countryCodes', header: 'Countries', cell: ({ row }) => <span className="text-xs font-mono">{row.original.countryCodes?.join(', ') || '—'}</span> },
    { accessorKey: 'programme', header: 'Programme', cell: ({ row }) => <span className="text-xs truncate max-w-[150px] block">{row.original.programme ?? '—'}</span> },
    { accessorKey: 'listedDate', header: 'Listed', cell: ({ row }) => <span className="text-xs">{row.original.listedDate ? formatDate(row.original.listedDate) : '—'}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => row.original.isActive ? <span className="text-green-600 text-xs font-bold">✓</span> : <span className="text-red-600 text-xs font-bold">✗</span> },
  ];

  // Analytics data
  const outcomeData = useMemo(() => [
    { name: 'Clear', value: stats?.clear ?? 0 },
    { name: 'Potential', value: stats?.potentialMatch ?? 0 },
    { name: 'Confirmed', value: stats?.confirmedMatch ?? 0 },
  ], [stats]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    pending.forEach((s) => s.matches?.forEach((m) => { counts[m.watchlistSource] = (counts[m.watchlistSource] ?? 0) + 1; }));
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [pending]);

  const hitRate = stats ? ((stats.potentialMatch + stats.confirmedMatch) / Math.max(stats.totalScreenings, 1)) * 100 : 0;

  const handleBatchScreen = () => {
    const lines = batchInput.trim().split('\n').filter(Boolean);
    const names = lines.map((line) => {
      const parts = line.split('|');
      return { name: parts[0].trim(), type: parts[1]?.trim() || 'INDIVIDUAL', dob: parts[2]?.trim(), nationality: parts[3]?.trim() };
    });
    batchScreen.mutate({ names }, {
      onSuccess: () => { toast.success(`Batch screening started for ${names.length} names`); setBatchInput(''); },
      onError: () => toast.error('Failed to start batch screening'),
    });
  };

  const tabs = [
    {
      id: 'pending',
      label: 'Pending Review',
      badge: pending.length || undefined,
      content: (
        <div className="p-4 space-y-2">
          <DataTable
            columns={pendingCols}
            data={pending}
            isLoading={pendingLoading}
            enableGlobalFilter
            emptyMessage="No screenings pending review"
            pageSize={15}
            onRowClick={(row) => navigate(`/compliance/sanctions/screenings/${row.id}`)}
          />
          {/* Expanded match rows */}
          {expandedRef && pending.filter((s) => s.screeningRef === expandedRef).map((s) => (
            <div key={s.id} className="pl-8 pr-4 space-y-1.5 pb-4">
              {s.matches?.map((m) => (
                <MatchInlineCard key={m.id} match={m} onConfirm={handleConfirm} onFalsePositive={handleFalsePositive} />
              ))}
              {(!s.matches || s.matches.length === 0) && <p className="text-xs text-muted-foreground py-2">No match details available</p>}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'all',
      label: 'All Screenings',
      content: (
        <div className="p-4 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs w-40">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CLEAR">Clear</option>
              <option value="POTENTIAL_MATCH">Potential Match</option>
              <option value="CONFIRMED_MATCH">Confirmed</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input text-xs w-40">
              <option value="">All Types</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="TRANSACTION">Transaction</option>
              <option value="PERIODIC">Periodic</option>
              <option value="ADHOC">Ad-hoc</option>
            </select>
          </div>
          <DataTable columns={allCols} data={allScreenings} isLoading={screeningsLoading} enableGlobalFilter enableExport exportFilename="sanctions-screenings" emptyMessage="No screenings found" />
        </div>
      ),
    },
    {
      id: 'watchlists',
      label: 'Watchlists',
      content: (
        <div className="p-4">
          <DataTable columns={watchlistCols} data={watchlists} isLoading={watchlistsLoading} enableGlobalFilter enableExport exportFilename="watchlists" emptyMessage="No watchlist entries" />
        </div>
      ),
    },
    {
      id: 'batch',
      label: 'Batch Screening',
      content: (
        <div className="p-6 space-y-6">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Batch Screen Names</h3>
            <p className="text-xs text-muted-foreground">Enter names to screen, one per line. Format: Name|TYPE|DOB|NATIONALITY</p>
            <textarea
              className="w-full input h-32 resize-y font-mono text-xs"
              placeholder={"John Doe|INDIVIDUAL|1985-03-15|NG\nAcme Corp|COMPANY"}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
            />
            <button
              onClick={handleBatchScreen}
              disabled={!batchInput.trim() || batchScreen.isPending}
              className="flex items-center gap-2 btn-primary"
            >
              {batchScreen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {batchScreen.isPending ? 'Processing...' : 'Screen All'}
            </button>
          </div>

          {batchJobs.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Batch Jobs</h3>
              <div className="space-y-2">
                {batchJobs.map((job, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 text-sm">
                    <span className="font-mono text-xs">{String(job.jobId ?? `JOB-${i + 1}`)}</span>
                    <span className="text-xs">{String(job.namesCount ?? '—')} names</span>
                    <StatusBadge status={String(job.status ?? 'UNKNOWN')} />
                    <span className="text-xs">{String(job.matchesFound ?? 0)} matches</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Screenings by Outcome</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {outcomeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Matches by Watchlist</h3>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sourceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Matches" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No match data</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Hit Rate</p>
              <p className="text-2xl font-bold font-mono mt-1">{hitRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">False Positive Rate</p>
              <p className="text-2xl font-bold font-mono mt-1 text-green-600">
                {stats && stats.potentialMatch > 0 ? ((stats.potentialMatch - stats.confirmedMatch) / stats.potentialMatch * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Avg Screening Time</p>
              <p className="text-2xl font-bold font-mono mt-1">{stats?.avgScreeningTimeMs ?? 0}ms</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Screenings</p>
              <p className="text-2xl font-bold font-mono mt-1">{stats?.totalScreenings?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showScreenDialog && <ScreenNameDialog onClose={() => setShowScreenDialog(false)} />}

      <PageHeader
        title="Sanctions & PEP Screening"
        subtitle="Watchlist screening, match disposition, and compliance monitoring"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowScreenDialog(true)} className="flex items-center gap-2 btn-primary">
              <Search className="w-4 h-4" /> Screen Name
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Urgency banner */}
        {pending.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="flex-1 text-sm text-amber-700 dark:text-amber-300 font-medium">
              {pending.length} screening(s) with potential matches require disposition
            </p>
            <button onClick={() => {/* Tab already defaults to pending */}} className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">Review Now</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Screenings" value={stats?.totalScreenings ?? 0} format="number" icon={FileSearch} loading={statsLoading} />
          <StatCard label="Clear" value={stats?.clear ?? 0} format="number" icon={CheckCircle} loading={statsLoading} />
          <StatCard label="Potential Matches" value={stats?.potentialMatch ?? 0} format="number" icon={AlertTriangle} loading={statsLoading} />
          <StatCard label="Confirmed Matches" value={stats?.confirmedMatch ?? 0} format="number" icon={XCircle} loading={statsLoading} />
          <StatCard label="Pending Review" value={stats?.pendingReview ?? 0} format="number" icon={Eye} loading={statsLoading} />
          <StatCard label="Avg Time" value={`${stats?.avgScreeningTimeMs ?? 0}ms`} icon={Clock} loading={statsLoading} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
