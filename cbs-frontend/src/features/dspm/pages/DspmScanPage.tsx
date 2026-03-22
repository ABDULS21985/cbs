import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Scan, Play, CheckCircle, AlertTriangle, Plus, Loader2, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/formatters';
import { useDspmScans, useStartDspmScan, useCompleteDspmScan, useDspmSources } from '../hooks/useDspm';
import type { DspmScan } from '../types/dspm';

const SCOPE_OPTIONS = ['ALL', 'DATABASES', 'FILE_SYSTEMS', 'CLOUD_STORAGE', 'API_ENDPOINTS'] as const;
const ASSET_TYPE_OPTIONS = ['PII', 'PHI', 'PCI', 'FINANCIAL', 'CREDENTIALS', 'INTELLECTUAL_PROPERTY'] as const;

export function DspmScanPage() {
  useEffect(() => { document.title = 'Data Scans | DSPM | CBS'; }, []);

  const [showNewScan, setShowNewScan] = useState(false);
  const [showComplete, setShowComplete] = useState<DspmScan | null>(null);
  const { data: scans = [], isLoading } = useDspmScans();
  const startScanMutation = useStartDspmScan();
  const completeScanMutation = useCompleteDspmScan();

  const stats = useMemo(() => {
    const total = scans.length;
    const inProgress = scans.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'RUNNING').length;
    const completed = scans.filter((s) => s.status === 'COMPLETED').length;
    const issues = scans.reduce((sum, s) => sum + s.issuesFound, 0);
    return { total, inProgress, completed, issues };
  }, [scans]);

  const columns: ColumnDef<DspmScan, unknown>[] = [
    {
      accessorKey: 'scanCode',
      header: 'Scan Code',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.scanCode}</span>,
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.scope?.replace(/_/g, ' ') ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'assetTypes',
      header: 'Asset Types',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.assetTypes ?? []).map((t) => (
            <span key={t} className="inline-flex px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'issuesFound',
      header: 'Issues',
      cell: ({ row }) => (
        <span className={row.original.issuesFound > 0 ? 'text-red-600 font-semibold' : ''}>
          {row.original.issuesFound}
        </span>
      ),
    },
    {
      accessorKey: 'startedAt',
      header: 'Started At',
      cell: ({ row }) => row.original.startedAt ? formatDateTime(row.original.startedAt) : '—',
    },
    {
      accessorKey: 'durationSec',
      header: 'Duration',
      cell: ({ row }) => {
        const d = row.original.durationSec;
        if (d == null || d === 0) return '—';
        if (d < 60) return `${d}s`;
        return `${Math.floor(d / 60)}m ${d % 60}s`;
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const scan = row.original;
        if (scan.status !== 'IN_PROGRESS') return null;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setShowComplete(scan); }}
            disabled={completeScanMutation.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
          >
            <StopCircle className="w-3 h-3" />
            Complete
          </button>
        );
      },
    },
  ];

  const handleStartScan = (data: { scope?: string; assetTypes?: string[]; fullScan?: boolean; sourceId?: number }) => {
    startScanMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Scan started successfully');
        setShowNewScan(false);
      },
      onError: () => {
        toast.error('Failed to start scan');
      },
    });
  };

  const handleCompleteScan = (findings: { issuesFound: number; critical: number; high: number; medium: number; low: number }) => {
    if (!showComplete) return;
    completeScanMutation.mutate(
      { code: showComplete.scanCode, findings },
      {
        onSuccess: () => {
          toast.success('Scan marked as completed');
          setShowComplete(null);
        },
        onError: () => toast.error('Failed to complete scan'),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Data Scans"
        subtitle="Configure and monitor data security posture scans"
        icon={Scan}
        actions={
          <Button onClick={() => setShowNewScan(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Scan
          </Button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Scans" value={stats.total} format="number" icon={Scan} loading={isLoading} />
          <StatCard label="In Progress" value={stats.inProgress} format="number" icon={Play} iconBg="bg-blue-50 dark:bg-blue-900/20" iconColor="text-blue-600" loading={isLoading} />
          <StatCard label="Completed" value={stats.completed} format="number" icon={CheckCircle} iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-600" loading={isLoading} />
          <StatCard label="Issues Found" value={stats.issues} format="number" icon={AlertTriangle} iconBg="bg-red-50 dark:bg-red-900/20" iconColor="text-red-600" loading={isLoading} />
        </div>

        <DataTable
          columns={columns}
          data={scans}
          isLoading={isLoading}
          enableGlobalFilter
          searchPlaceholder="Search scans..."
          emptyMessage="No scans found. Start a new scan to begin."
        />
      </div>

      {showNewScan && (
        <NewScanDialog
          open
          onClose={() => setShowNewScan(false)}
          onSubmit={handleStartScan}
          isSubmitting={startScanMutation.isPending}
        />
      )}

      {showComplete && (
        <CompleteScanDialog
          scan={showComplete}
          open
          onClose={() => setShowComplete(null)}
          onSubmit={handleCompleteScan}
          isSubmitting={completeScanMutation.isPending}
        />
      )}
    </>
  );
}

function NewScanDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { scope?: string; assetTypes?: string[]; fullScan?: boolean; sourceId?: number }) => void;
  isSubmitting: boolean;
}) {
  const [scope, setScope] = useState<string>('ALL');
  const [assetTypes, setAssetTypes] = useState<string[]>(['PII']);
  const [fullScan, setFullScan] = useState(false);
  const [sourceId, setSourceId] = useState<string>('');

  const { data: sources = [] } = useDspmSources();

  const toggleAssetType = (type: string) => {
    setAssetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSubmit = () => {
    const payload: { scope?: string; assetTypes?: string[]; fullScan?: boolean; sourceId?: number } = {
      scope,
      assetTypes,
      fullScan,
    };
    if (sourceId) {
      payload.sourceId = Number(sourceId);
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Data Scan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope */}
          <div>
            <Label>Scope</Label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Asset Types */}
          <div>
            <Label>Asset Types</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ASSET_TYPE_OPTIONS.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assetTypes.includes(type)}
                    onChange={() => toggleAssetType(type)}
                    className="rounded border-gray-300"
                  />
                  {type.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>

          {/* Full Scan */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={fullScan}
              onChange={(e) => setFullScan(e.target.checked)}
              className="rounded border-gray-300"
            />
            Full Scan (scan all records, not just delta)
          </label>

          {/* Source ID */}
          <div>
            <Label>Data Source (optional)</Label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">All sources</option>
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.sourceName} ({src.sourceCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || assetTypes.length === 0}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Start Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Complete Scan Dialog ──────────────────────────────────────────────────────

function CompleteScanDialog({
  scan,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  scan: DspmScan;
  open: boolean;
  onClose: () => void;
  onSubmit: (findings: { issuesFound: number; critical: number; high: number; medium: number; low: number }) => void;
  isSubmitting: boolean;
}) {
  const [findings, setFindings] = useState({ issuesFound: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const setF = (k: keyof typeof findings, v: string) =>
    setFindings(prev => ({ ...prev, [k]: Math.max(0, Number(v) || 0) }));

  // Keep issuesFound in sync with sum of severity findings
  const total = findings.critical + findings.high + findings.medium + findings.low;

  const handleSubmit = () => {
    // Backend params: issuesFound, critical, high, medium, low
    onSubmit({ ...findings, issuesFound: total > 0 ? total : findings.issuesFound });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Scan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Mark scan <span className="font-mono font-medium">{scan.scanCode}</span> as completed and record findings.
        </p>
        <div className="space-y-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(severity => (
            <div key={severity} className="flex items-center gap-3">
              <Label className="w-20 capitalize">{severity}</Label>
              <Input
                type="number"
                min={0}
                value={findings[severity]}
                onChange={e => setF(severity, e.target.value)}
                className="h-8"
              />
              <span className="text-xs text-muted-foreground">findings</span>
            </div>
          ))}
          <div className="pt-1 border-t text-sm font-medium">
            Total Issues: <span className="font-mono">{total > 0 ? total : findings.issuesFound}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Complete Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
