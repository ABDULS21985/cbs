import { useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Database, Plus, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { useDspmSources, useCreateDspmSource } from '../hooks/useDspm';
import type { DspmDataSource } from '../types/dspm';
import { formatRecordCount } from '../types/dspm';

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_TYPES = ['DATABASE', 'FILE_SYSTEM', 'CLOUD_STORAGE', 'API', 'QUEUE', 'DATA_LAKE'] as const;
const ENVIRONMENTS = ['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'DR'] as const;
const CLASSIFICATIONS = ['UNCLASSIFIED', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'TOP_SECRET'] as const;
const SENSITIVITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const sensitivityColorMap: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

// ─── Register Source Dialog ──────────────────────────────────────────────────

function RegisterSourceDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DspmDataSource>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    sourceName: '',
    sourceType: 'DATABASE',
    connectionRef: '',
    environment: 'PRODUCTION',
    owner: '',
    classification: 'UNCLASSIFIED',
    sensitivityLevel: 'LOW',
    tags: '',
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-background';

  const handleSubmit = () => {
    if (!form.sourceName.trim()) {
      toast.error('Source name is required');
      return;
    }
    const tagList = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSubmit({
      sourceName: form.sourceName,
      sourceType: form.sourceType,
      connectionRef: form.connectionRef || undefined,
      environment: form.environment,
      owner: form.owner || undefined,
      classification: form.classification,
      sensitivityLevel: form.sensitivityLevel,
      tags: tagList,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Data Source</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Name *</Label>
            <Input
              value={form.sourceName}
              onChange={e => set('sourceName', e.target.value)}
              placeholder="e.g. Core Banking PostgreSQL"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source Type</Label>
              <select value={form.sourceType} onChange={e => set('sourceType', e.target.value)} className={cn(inputCls, 'mt-1')}>
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Environment</Label>
              <select value={form.environment} onChange={e => set('environment', e.target.value)} className={cn(inputCls, 'mt-1')}>
                {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Connection Reference</Label>
            <Input
              value={form.connectionRef}
              onChange={e => set('connectionRef', e.target.value)}
              placeholder="e.g. jdbc:postgresql://db-host:5432/cbs"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Input
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
              placeholder="e.g. DBA Team"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Classification</Label>
              <select value={form.classification} onChange={e => set('classification', e.target.value)} className={cn(inputCls, 'mt-1')}>
                {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label>Sensitivity Level</Label>
              <select value={form.sensitivityLevel} onChange={e => set('sensitivityLevel', e.target.value)} className={cn(inputCls, 'mt-1')}>
                {SENSITIVITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="e.g. pii, financial, core"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DspmDataSourcePage() {
  useEffect(() => { document.title = 'Data Sources | DSPM | CBS'; }, []);

  const [showRegister, setShowRegister] = useState(false);
  const { data: sources = [], isLoading } = useDspmSources();
  const createMutation = useCreateDspmSource();

  const stats = useMemo(() => {
    const total = sources.length;
    const active = sources.filter(s => s.status === 'ACTIVE').length;
    const highSensitivity = sources.filter(s => s.sensitivityLevel === 'HIGH' || s.sensitivityLevel === 'CRITICAL').length;
    const totalPiiFields = sources.reduce((sum, s) => sum + (s.piiFieldsCount ?? 0), 0);
    return { total, active, highSensitivity, totalPiiFields };
  }, [sources]);

  const handleCreate = (data: Partial<DspmDataSource>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Data source registered successfully');
        setShowRegister(false);
      },
      onError: () => toast.error('Failed to register data source'),
    });
  };

  const columns: ColumnDef<DspmDataSource, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'sourceCode',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary font-medium">{row.original.sourceCode}</span>
        ),
      },
      {
        accessorKey: 'sourceName',
        header: 'Name',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.sourceName}</span>
        ),
      },
      {
        accessorKey: 'sourceType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.sourceType?.replace(/_/g, ' ')}</span>
        ),
      },
      {
        accessorKey: 'environment',
        header: 'Environment',
        cell: ({ row }) => <StatusBadge status={row.original.environment} />,
      },
      {
        accessorKey: 'classification',
        header: 'Classification',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.classification?.replace(/_/g, ' ')}</span>
        ),
      },
      {
        accessorKey: 'sensitivityLevel',
        header: 'Sensitivity',
        cell: ({ row }) => {
          const s = row.original.sensitivityLevel;
          return (
            <span className={cn('ui-chip', sensitivityColorMap[s] ?? 'bg-muted text-muted-foreground')}>
              {s}
            </span>
          );
        },
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: ({ row }) => <span className="text-xs">{row.original.owner || '—'}</span>,
      },
      {
        accessorKey: 'recordCount',
        header: 'Records',
        cell: ({ row }) => (
          // recordCount is a JSON string (ToStringSerializer) to preserve BIGINT precision
          <span className="tabular-nums text-xs font-mono">
            {formatRecordCount(row.original.recordCount)}
          </span>
        ),
      },
      {
        accessorKey: 'piiFieldsCount',
        header: 'PII Fields',
        cell: ({ row }) => (
          <span className={cn('tabular-nums text-sm', (row.original.piiFieldsCount ?? 0) > 0 && 'text-amber-600 font-semibold')}>
            {row.original.piiFieldsCount ?? 0}
          </span>
        ),
      },
      {
        accessorKey: 'lastScanAt',
        header: 'Last Scan',
        cell: ({ row }) =>
          row.original.lastScanAt ? formatDateTime(row.original.lastScanAt) : <span className="text-muted-foreground text-xs">Never</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Data Sources"
        subtitle="Inventory and classify all data stores under DSPM coverage"
        icon={Database}
        actions={
          <Button onClick={() => setShowRegister(true)}>
            <Plus className="w-4 h-4 mr-1" /> Register Source
          </Button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Sources" value={stats.total} format="number" icon={Database} loading={isLoading} />
          <StatCard label="Active" value={stats.active} format="number" icon={ShieldCheck} iconBg="bg-green-50 dark:bg-green-900/20" iconColor="text-green-600" loading={isLoading} />
          <StatCard label="High Sensitivity" value={stats.highSensitivity} format="number" icon={AlertTriangle} iconBg="bg-red-50 dark:bg-red-900/20" iconColor="text-red-600" loading={isLoading} />
          <StatCard label="PII Fields" value={stats.totalPiiFields} format="number" icon={ShieldCheck} iconBg="bg-amber-50 dark:bg-amber-900/20" iconColor="text-amber-600" loading={isLoading} />
        </div>

        <DataTable
          columns={columns}
          data={sources}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="dspm-data-sources"
          searchPlaceholder="Search data sources..."
          emptyMessage="No data sources registered. Register a source to begin tracking."
        />
      </div>

      {showRegister && (
        <RegisterSourceDialog
          open
          onClose={() => setShowRegister(false)}
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      )}
    </>
  );
}
