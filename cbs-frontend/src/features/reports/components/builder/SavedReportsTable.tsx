import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Play, Pencil, Share2, Trash2, Loader2, X, Plus } from 'lucide-react';
import { DataTable } from '@/components/shared';
import { ConfirmDialog } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { reportBuilderApi, type SavedReport } from '../../api/reportBuilderApi';
import type { ColumnDef } from '@tanstack/react-table';

type OwnerFilter = 'mine' | 'shared' | 'all';

interface SavedReportsTableProps {
  onRun: (report: SavedReport) => void;
  onEdit: (report: SavedReport) => void;
}

const SCHEDULE_BADGE_COLORS: Record<string, string> = {
  MANUAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  DAILY: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  WEEKLY: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  MONTHLY: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
};

export function SavedReportsTable({ onRun, onEdit }: SavedReportsTableProps) {
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<SavedReport | null>(null);
  const [shareTarget, setShareTarget] = useState<SavedReport | null>(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['saved-reports', ownerFilter],
    queryFn: () => reportBuilderApi.getSavedReports({ owner: ownerFilter }),
    staleTime: 2 * 60 * 1000,
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

  const columns: ColumnDef<SavedReport>[] = [
    {
      accessorKey: 'name',
      header: 'Report Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground truncate max-w-[240px]">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: 'Created By',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.createdBy}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</div>
        </div>
      ),
    },
    {
      id: 'dataSources',
      header: 'Data Source(s)',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.config.dataSources.slice(0, 3).map((src) => (
            <span key={src} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{src.replace('_', ' ')}</span>
          ))}
          {row.original.config.dataSources.length > 3 && (
            <span className="text-xs text-muted-foreground">+{row.original.config.dataSources.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'lastRun',
      header: 'Last Run',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastRun ? formatRelative(row.original.lastRun) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'schedule',
      header: 'Schedule',
      cell: ({ row }) => (
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SCHEDULE_BADGE_COLORS[row.original.schedule] ?? SCHEDULE_BADGE_COLORS.MANUAL)}>
          {row.original.schedule}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRun(row.original)}
            title="Run report"
            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(row.original)}
            title="Edit report"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShareTarget(row.original)}
            title="Share report"
            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(row.original)}
            title="Delete report"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-muted/50 w-fit">
        {(['all', 'mine', 'shared'] as OwnerFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setOwnerFilter(f)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
              ownerFilter === f ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f === 'all' ? 'All Reports' : f === 'mine' ? 'My Reports' : 'Shared'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={reports}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No reports found. Create your first report."
      />

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

      {shareTarget && (
        <ShareDialog
          report={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}

interface ShareDialogProps {
  report: SavedReport;
  onClose: () => void;
}

function ShareDialog({ report, onClose }: ShareDialogProps) {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);

  const shareMutation = useMutation({
    mutationFn: () => reportBuilderApi.shareReport(report.id, emails),
    onSuccess: () => {
      toast.success('Report shared successfully');
      onClose();
    },
    onError: () => toast.error('Failed to share report'),
  });

  function addEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed || emails.includes(trimmed)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    setEmails([...emails, trimmed]);
    setEmailInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Share Report</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Share "{report.name}" with colleagues</p>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Addresses</label>
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[48px]">
              {emails.map((email) => (
                <span key={email} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {email}
                  <button onClick={() => setEmails(emails.filter((e) => e !== email))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addEmail}
                placeholder={emails.length === 0 ? 'Add email addresses...' : 'Add more...'}
                className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
              <button onClick={addEmail} className="text-muted-foreground hover:text-primary">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={() => shareMutation.mutate()}
              disabled={emails.length === 0 || shareMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {shareMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Share
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
