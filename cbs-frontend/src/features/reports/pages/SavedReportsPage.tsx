import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Play, Pencil, Copy, Trash2, History, Search, Loader2,
  CheckCircle2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/formatters';
import { reportBuilderApi, type SavedReport, type ReportResult } from '../api/reportBuilderApi';
import { ReportExecutionView } from '../components/builder/ReportExecutionView';
import { RunHistoryTable } from '../components/builder/RunHistoryTable';

// ─── Tab types ─────────────────────────────────────────────────────────────────

type TabKey = 'mine' | 'shared' | 'scheduled' | 'recent';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'mine', label: 'My Reports', icon: Play },
  { key: 'shared', label: 'Shared With Me', icon: CheckCircle2 },
  { key: 'scheduled', label: 'Scheduled', icon: Calendar },
  { key: 'recent', label: 'Recent Runs', icon: History },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SCHEDULE_BADGE: Record<string, string> = {
  MANUAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  DAILY: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  WEEKLY: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  MONTHLY: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
};

// ─── Report row component ──────────────────────────────────────────────────────

interface ReportRowProps {
  report: SavedReport;
  onRun: (r: SavedReport) => void;
  onEdit: (r: SavedReport) => void;
  onClone: (r: SavedReport) => void;
  onDelete: (r: SavedReport) => void;
  isRunning: boolean;
}

function ReportRow({ report, onRun, onEdit, onClone, onDelete, isRunning }: ReportRowProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
        <td className="px-4 py-3">
          <div className="font-medium text-sm">{report.name}</div>
          {report.description && (
            <div className="text-xs text-muted-foreground truncate max-w-[280px] mt-0.5">{report.description}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {report.config.dataSources.slice(0, 3).map((src) => (
              <span key={src} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                {src.replace(/_/g, ' ')}
              </span>
            ))}
            {report.config.dataSources.length > 3 && (
              <span className="text-xs text-muted-foreground">+{report.config.dataSources.length - 3}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {report.lastRun ? formatRelative(report.lastRun) : '—'}
        </td>
        <td className="px-4 py-3">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SCHEDULE_BADGE[report.schedule] ?? SCHEDULE_BADGE.MANUAL)}>
            {report.schedule}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {formatDate(report.createdAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onRun(report)}
              disabled={isRunning}
              title="Run report"
              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(report)}
              title="Edit report"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onClone(report)}
              title="Clone report"
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              title="View run history"
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                historyOpen
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(report)}
              title="Delete report"
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {historyOpen && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="px-6 py-4">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Run History</div>
            <RunHistoryTable reportId={report.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Reports table ─────────────────────────────────────────────────────────────

interface ReportsTableProps {
  owner: 'mine' | 'shared' | 'all';
  scheduledOnly?: boolean;
  onRun: (r: SavedReport) => void;
  onEdit: (r: SavedReport) => void;
  onClone: (r: SavedReport) => void;
  onDelete: (r: SavedReport) => void;
  runningId: string | null;
}

function ReportsTable({ owner, scheduledOnly, onRun, onEdit, onClone, onDelete, runningId }: ReportsTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ['saved-reports', owner],
    queryFn: () => reportBuilderApi.getSavedReports({ owner }),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = reports.filter((r) => {
    if (scheduledOnly && r.schedule === 'MANUAL') return false;
    if (categoryFilter && !(r as any).category?.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load reports from the backend.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Categories</option>
          {['Operations', 'Finance', 'Risk', 'Compliance', 'Sales', 'Marketing', 'Executive'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading reports...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
          {search || categoryFilter ? 'No reports match your search.' : 'No reports found. Create your first report.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data Sources</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Last Run</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onRun={onRun}
                  onEdit={onEdit}
                  onClone={onClone}
                  onDelete={onDelete}
                  isRunning={runningId === report.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function SavedReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('mine');
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);
  const [activeResult, setActiveResult] = useState<ReportResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedReport | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const runMutation = useMutation({
    mutationFn: (report: SavedReport) => reportBuilderApi.runReport(report.id),
    onSuccess: (result, report) => {
      setActiveResult(result);
      setRunningId(null);
      toast.success(`"${report.name}" ran successfully — ${result.rowCount.toLocaleString()} rows`);
    },
    onError: () => {
      setRunningId(null);
      toast.error('Failed to run report');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (report: SavedReport) => reportBuilderApi.cloneReport(report.id),
    onSuccess: () => {
      toast.success('Report cloned');
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
    },
    onError: () => toast.error('Failed to clone report'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportBuilderApi.deleteReport(id),
    onSuccess: () => {
      toast.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete report'),
  });

  function handleRun(report: SavedReport) {
    setActiveReport(report);
    setActiveResult(null);
    setRunningId(report.id);
    runMutation.mutate(report);
  }

  function handleEdit(report: SavedReport) {
    navigate(`/reports/custom/new?edit=${report.id}`);
  }

  function handleClone(report: SavedReport) {
    cloneMutation.mutate(report);
  }

  function handleDelete(report: SavedReport) {
    setDeleteTarget(report);
  }

  function handleCloseViewer() {
    setActiveReport(null);
    setActiveResult(null);
  }

  const ownerMap: Record<TabKey, 'mine' | 'shared' | 'all'> = {
    mine: 'mine',
    shared: 'shared',
    scheduled: 'all',
    recent: 'all',
  };

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Report Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, schedule, and manage custom reports from any data source
          </p>
        </div>
        <button
          onClick={() => navigate('/reports/custom/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Active run result viewer */}
      {activeReport && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <h2 className="text-base font-semibold text-muted-foreground">Running:</h2>
            <span className="font-semibold">{activeReport.name}</span>
            <button
              onClick={handleCloseViewer}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Close
            </button>
          </div>
          <ReportExecutionView
            report={activeReport}
            result={activeResult}
            onRefresh={() => { if (activeReport) runMutation.mutate(activeReport); }}
            isLoading={runMutation.isPending}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <ReportsTable
        owner={ownerMap[activeTab]}
        scheduledOnly={activeTab === 'scheduled'}
        onRun={handleRun}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        runningId={runningId}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        title="Delete Report"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
