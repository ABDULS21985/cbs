import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, FileText, Play, Download, Loader2, X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useRegulatoryDefinitions,
  useRegulatoryRuns,
  useCreateRegulatoryDefinition,
} from '../hooks/useComplianceExt';
import { regulatoryApi } from '../api/regulatoryExtApi';
import type { RegulatoryReportDefinition, RegulatoryReportRun, ReportCategory } from '../types/regulatoryExt';

// ── Constants ────────────────────────────────────────────────────────────────

const FREQ_COLORS: Record<string, string> = {
  DAILY: 'bg-red-100 text-red-700', MONTHLY: 'bg-blue-100 text-blue-700',
  QUARTERLY: 'bg-amber-100 text-amber-700', ANNUAL: 'bg-green-100 text-green-700',
};

const RUN_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-600', GENERATING: 'text-blue-600', COMPLETED: 'text-green-600',
  FAILED: 'text-red-600', SUBMITTED: 'text-purple-600',
};

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Create Definition Dialog ─────────────────────────────────────────────────

function CreateDefinitionDialog({ onClose }: { onClose: () => void }) {
  const createMut = useCreateRegulatoryDefinition();
  const [form, setForm] = useState({
    reportName: '', regulator: 'CBN', frequency: 'MONTHLY',
    reportCategory: 'PRUDENTIAL' as ReportCategory, dataQuery: '', templateConfig: '{}',
    outputFormat: 'XLSX',
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Create Report Definition</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div><label className="text-xs font-medium text-muted-foreground">Report Name *</label><input value={form.reportName} onChange={(e) => setForm({ ...form, reportName: e.target.value })} className={fc} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Regulator</label>
              <select value={form.regulator} onChange={(e) => setForm({ ...form, regulator: e.target.value })} className={fc}>
                {['CBN', 'FCA', 'RBNZ', 'ASIC', 'SEC', 'NFIU', 'FATF', 'MAS', 'PRA', 'APRA'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={fc}>
                {['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <select value={form.reportCategory} onChange={(e) => setForm({ ...form, reportCategory: e.target.value as ReportCategory })} className={fc}>
                {['PRUDENTIAL', 'STATISTICAL', 'AML_CFT', 'RISK', 'LIQUIDITY', 'CAPITAL_ADEQUACY', 'CREDIT', 'MARKET_RISK', 'OPERATIONAL_RISK', 'OTHER'].map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Output Format</label>
              <select value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })} className={fc}>
                {['XLSX', 'CSV', 'JSON', 'XML'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Data Query (SQL Template)</label><textarea value={form.dataQuery} onChange={(e) => setForm({ ...form, dataQuery: e.target.value })} rows={4} className={cn(fc, 'font-mono text-xs')} /></div>
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button onClick={() => createMut.mutate({ ...form, templateConfig: JSON.parse(form.templateConfig || '{}') } as any, { onSuccess: () => { toast.success('Definition created'); onClose(); }, onError: () => toast.error('Failed to create') })} disabled={!form.reportName || createMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Generate Report Dialog ───────────────────────────────────────────────────

function GenerateReportDialog({ reportCode, onClose }: { reportCode: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ periodStart: '', periodEnd: '' });
  const [result, setResult] = useState<RegulatoryReportRun | null>(null);

  const generateMut = useMutation({
    mutationFn: () => regulatoryApi.generate(reportCode, form),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['compliance', 'regulatory'] });
      toast.success('Report generated');
    },
    onError: () => toast.error('Generation failed'),
  });

  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Generate Report</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">Report Code</label><input value={reportCode} className={cn(fc, 'font-mono bg-muted')} readOnly /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground">Period Start *</label><input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className={fc} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Period End *</label><input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className={fc} required /></div>
        </div>
        {result ? (
          <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircle2 className="w-4 h-4" /> Report Generated</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Records:</span> {result.recordCount}</div>
              <div><span className="text-muted-foreground">Size:</span> {formatBytes(result.fileSizeBytes)}</div>
              <div><span className="text-muted-foreground">Time:</span> {result.generationTimeMs}ms</div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 mt-2"><Download className="w-3 h-3" /> Download</button>
          </div>
        ) : (
          <button onClick={() => generateMut.mutate()} disabled={!form.periodStart || !form.periodEnd || generateMut.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {generateMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Play className="w-4 h-4" /> Generate</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function RegulatoryDefinitionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [generateCode, setGenerateCode] = useState<string | null>(null);
  const [selectedRunCode, setSelectedRunCode] = useState('');

  const { data: definitions = [], isLoading } = useRegulatoryDefinitions();
  const { data: runs = [], isLoading: runsLoading } = useRegulatoryRuns(selectedRunCode);

  const activeCount = definitions.filter((d) => d.isActive).length;
  const freqCounts = ['DAILY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'].reduce<Record<string, number>>((acc, f) => {
    acc[f] = definitions.filter((d) => d.frequency === f).length;
    return acc;
  }, {});

  const defColumns: ColumnDef<RegulatoryReportDefinition, unknown>[] = [
    { accessorKey: 'reportCode', header: 'Report Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.reportCode}</span> },
    { accessorKey: 'reportName', header: 'Report Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.reportName}</span> },
    { accessorKey: 'regulator', header: 'Regulator', cell: ({ row }) => <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{row.original.regulator}</span> },
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', FREQ_COLORS[row.original.frequency])}>{row.original.frequency}</span> },
    { accessorKey: 'reportCategory', header: 'Category', cell: ({ row }) => <span className="text-xs">{String(row.original.reportCategory).replace(/_/g, ' ')}</span> },
    { accessorKey: 'outputFormat', header: 'Format', cell: ({ row }) => <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.outputFormat}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button onClick={() => setGenerateCode(row.original.reportCode)} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted flex items-center gap-1"><Play className="w-3 h-3" /> Generate</button>
        <button onClick={() => setSelectedRunCode(row.original.reportCode)} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted">Runs</button>
      </div>
    )},
  ];

  const runColumns: ColumnDef<RegulatoryReportRun, unknown>[] = [
    { accessorKey: 'reportCode', header: 'Report', cell: ({ row }) => <span className="font-mono text-xs">{row.original.reportCode}</span> },
    { id: 'period', header: 'Period', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.reportingPeriodStart)} → {formatDate(row.original.reportingPeriodEnd)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'recordCount', header: 'Records', cell: ({ row }) => <span className="font-mono text-xs">{row.original.recordCount ?? '—'}</span> },
    { accessorKey: 'fileSizeBytes', header: 'Size', cell: ({ row }) => <span className="text-xs">{formatBytes(row.original.fileSizeBytes)}</span> },
    { accessorKey: 'generationTimeMs', header: 'Time', cell: ({ row }) => <span className="font-mono text-xs">{row.original.generationTimeMs ? `${row.original.generationTimeMs}ms` : '—'}</span> },
    { accessorKey: 'generatedBy', header: 'Generated By', cell: ({ row }) => <span className="text-xs">{row.original.generatedBy || '—'}</span> },
    { accessorKey: 'generatedAt', header: 'Generated', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.generatedAt ? formatDate(row.original.generatedAt) : '—'}</span> },
    { accessorKey: 'submissionRef', header: 'Submission', cell: ({ row }) => <span className="font-mono text-xs">{row.original.submissionRef || '—'}</span> },
  ];

  return (
    <>
      {showCreate && <CreateDefinitionDialog onClose={() => setShowCreate(false)} />}
      {generateCode && <GenerateReportDialog reportCode={generateCode} onClose={() => setGenerateCode(null)} />}

      <PageHeader title="Regulatory Report Definitions" subtitle="Define, generate, and submit regulatory reports"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Create Definition</button>}
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Definitions" value={definitions.length} format="number" icon={FileText} loading={isLoading} />
          <StatCard label="Active" value={activeCount} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Monthly" value={freqCounts.MONTHLY ?? 0} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Quarterly" value={freqCounts.QUARTERLY ?? 0} format="number" icon={Clock} loading={isLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'definitions', label: 'Definitions', badge: definitions.length || undefined, content: (
            <div className="p-4">
              <DataTable columns={defColumns} data={definitions} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="regulatory-definitions" emptyMessage="No definitions found" pageSize={15} />
            </div>
          )},
          { id: 'runs', label: 'Report Runs', content: (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground">Report:</label>
                <select value={selectedRunCode} onChange={(e) => setSelectedRunCode(e.target.value)} className="px-3 py-1.5 text-sm rounded-md border bg-background min-w-[200px]">
                  <option value="">Select a report...</option>
                  {definitions.map((d) => <option key={d.reportCode} value={d.reportCode}>{d.reportCode} — {d.reportName}</option>)}
                </select>
              </div>
              {selectedRunCode ? (
                <DataTable columns={runColumns} data={runs} isLoading={runsLoading} enableGlobalFilter emptyMessage="No runs found for this report" pageSize={10} />
              ) : (
                <div className="rounded-lg border p-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a report code above to view its run history.</p>
                </div>
              )}
            </div>
          )},
        ]} />
      </div>
    </>
  );
}
