import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Database, Plus, Play, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDataLakeJobs, useCreateDataLakeJob, useExecuteDataLakeJob } from '../hooks/useGatewayData';
import type { DataExportJob } from '../types/dataLake';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SCHEDULED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const ENTITY_TYPES = ['CUSTOMER', 'ACCOUNT', 'TRANSACTION', 'LOAN', 'CARD', 'PAYMENT', 'FEE', 'DEPOSIT', 'GL_ENTRY'];
const FORMATS = ['CSV', 'JSON', 'PARQUET'];
const SCHEDULES = ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'];

export function DataLakePage() {
  useEffect(() => { document.title = 'Data Lake | CBS'; }, []);
  const [showCreate, setShowCreate] = useState(false);

  const { data: jobs = [], isLoading } = useDataLakeJobs();
  const createJob = useCreateDataLakeJob();
  const executeJob = useExecuteDataLakeJob();

  const [form, setForm] = useState({
    sourceEntity: 'CUSTOMER', exportFormat: 'CSV', incremental: true, schedule: 'ONCE',
    jobName: '', destinationPath: '/data-lake/exports/',
  });

  const [executingId, setExecutingId] = useState<number | null>(null);

  const handleExecute = (job: DataExportJob) => {
    setExecutingId(job.id);
    executeJob.mutate(job.id as never, {
      onSuccess: () => { toast.success('Job executed'); setExecutingId(null); },
      onError: () => { toast.error('Execution failed'); setExecutingId(null); },
    });
  };

  const jobList = Array.isArray(jobs) ? jobs : [];

  const columns = useMemo<ColumnDef<DataExportJob, unknown>[]>(() => [
    { accessorKey: 'id', header: 'Job ID', cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span> },
    { accessorKey: 'jobName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.jobName || '—'}</span> },
    { accessorKey: 'sourceEntity', header: 'Entity', cell: ({ row }) => (
      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{row.original.sourceEntity}</span>
    )},
    { accessorKey: 'exportFormat', header: 'Format', cell: ({ row }) => <span className="text-xs font-mono">{row.original.exportFormat}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[row.original.status] || STATUS_COLORS.PENDING)}>
        {row.original.status}
      </span>
    )},
    { accessorKey: 'lastRecordCount', header: 'Records', cell: ({ row }) => <span className="font-mono text-xs">{(row.original.lastRecordCount ?? 0).toLocaleString()}</span> },
    { accessorKey: 'destinationPath', header: 'Output', cell: ({ row }) => <span className="font-mono text-xs truncate max-w-[150px] block text-muted-foreground">{row.original.destinationPath || '—'}</span> },
    { accessorKey: 'lastRunAt', header: 'Last Run', cell: ({ row }) => <span className="text-xs">{row.original.lastRunAt ? formatDateTime(row.original.lastRunAt) : '—'}</span> },
    { accessorKey: 'lastDurationMs', header: 'Duration', cell: ({ row }) => <span className="font-mono text-xs">{row.original.lastDurationMs ? `${(row.original.lastDurationMs / 1000).toFixed(1)}s` : '—'}</span> },
    { accessorKey: 'scheduleCron', header: 'Schedule', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.scheduleCron || 'Once'}</span> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => {
      const canExecute = row.original.status !== 'RUNNING';
      return canExecute ? (
        <button onClick={() => handleExecute(row.original)} disabled={executingId === row.original.id}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50">
          {executingId === row.original.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Execute
        </button>
      ) : <span className="text-xs text-muted-foreground">Running...</span>;
    }},
  ], [executingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Data Lake Exports" backTo="/operations/gateway"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Export Job
          </button>
        }
      />

      <div className="page-container">
        <DataTable columns={columns} data={jobList} isLoading={isLoading} enableGlobalFilter enableExport
          exportFilename="data-lake-jobs" emptyMessage="No export jobs configured" pageSize={20} />
      </div>

      {/* Create Job Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">New Export Job</h3><button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Job Name</label>
              <input value={form.jobName} onChange={e => setForm(p => ({ ...p, jobName: e.target.value }))} placeholder="e.g. Daily Customer Export" className={fc} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Entity Type *</label>
                <select value={form.sourceEntity} onChange={e => setForm(p => ({ ...p, sourceEntity: e.target.value }))} className={fc}>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Format *</label>
                <select value={form.exportFormat} onChange={e => setForm(p => ({ ...p, exportFormat: e.target.value }))} className={fc}>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Schedule</label>
                <select value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))} className={fc}>
                  {SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
              <div className="space-y-1.5 flex items-end">
                <label className="flex items-center gap-2 pb-2">
                  <input type="checkbox" checked={form.incremental} onChange={e => setForm(p => ({ ...p, incremental: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Incremental</span>
                </label>
              </div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Destination Path</label>
              <input value={form.destinationPath} onChange={e => setForm(p => ({ ...p, destinationPath: e.target.value }))} className={cn(fc, 'font-mono')} /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => createJob.mutate({ jobName: form.jobName || `${form.sourceEntity}_export`, sourceEntity: form.sourceEntity, exportFormat: form.exportFormat, incremental: form.incremental, destinationPath: form.destinationPath } as never, {
                onSuccess: () => { toast.success('Export job created'); setShowCreate(false); },
              })} disabled={createJob.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Create Job
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
