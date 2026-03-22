import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Play, Send, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, EmptyState, DataTableSkeleton, ConfirmDialog, TabsPage } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { hasRole } from '@/lib/permissions';
import {
  regulatoryReportApi,
  type RegulatoryReportDefinition,
  type RegulatoryReportRun,
} from '../api/regulatoryReportApi';

// ─── Local UI Types ─────────────────────────────────────────────────────────────

type ReportCategory =
  | 'PRUDENTIAL' | 'STATISTICAL' | 'AML_CFT' | 'RISK' | 'LIQUIDITY'
  | 'CAPITAL_ADEQUACY' | 'CREDIT' | 'MARKET_RISK' | 'OPERATIONAL' | 'OTHER';

// ─── Constants ──────────────────────────────────────────────────────────────────

const REGULATOR_TABS = ['ALL', 'CBN', 'SEC', 'NDIC', 'FIRS', 'NFIU'] as const;
type RegulatorTab = (typeof REGULATOR_TABS)[number];

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  PRUDENTIAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  STATISTICAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  AML_CFT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RISK: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LIQUIDITY: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CAPITAL_ADEQUACY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CREDIT: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MARKET_RISK: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  OPERATIONAL: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const REPORT_CATEGORIES: ReportCategory[] = [
  'PRUDENTIAL', 'STATISTICAL', 'AML_CFT', 'RISK', 'LIQUIDITY',
  'CAPITAL_ADEQUACY', 'CREDIT', 'MARKET_RISK', 'OPERATIONAL', 'OTHER',
];

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC'];

// ─── Generate Dialog ────────────────────────────────────────────────────────────

function GenerateDialog({
  open,
  onClose,
  definition,
}: {
  open: boolean;
  onClose: () => void;
  definition: RegulatoryReportDefinition | null;
}) {
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      regulatoryReportApi.generateReport({ reportCode: definition!.reportCode, periodStart, periodEnd }),
    onSuccess: () => {
      toast.success('Report generation started');
      queryClient.invalidateQueries({ queryKey: ['regulatory', 'runs'] });
      onClose();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  if (!open || !definition) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <h3 className="text-lg font-semibold">Generate Report</h3>
          <p className="text-sm text-muted-foreground">
            Generate <span className="font-medium text-foreground">{definition.reportName}</span> ({definition.reportCode})
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !periodStart || !periodEnd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Definition Dialog ──────────────────────────────────────────────────────

function AddDefinitionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    reportCode: '',
    reportName: '',
    regulator: '',
    frequency: 'MONTHLY',
    category: 'PRUDENTIAL' as ReportCategory,
    format: 'XLSX',
    sqlQuery: '',
  });

  const mutation = useMutation({
    mutationFn: () => regulatoryReportApi.createDefinition(form),
    onSuccess: () => {
      toast.success('Definition created');
      queryClient.invalidateQueries({ queryKey: ['regulatory', 'definitions'] });
      onClose();
    },
    onError: () => toast.error('Failed to create definition'),
  });

  if (!open) return null;

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold">Add Report Definition</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Report Code</label>
              <input
                value={form.reportCode}
                onChange={(e) => update('reportCode', e.target.value.toUpperCase())}
                maxLength={30}
                placeholder="e.g. CBN_MBR300"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Regulator</label>
              <input
                value={form.regulator}
                onChange={(e) => update('regulator', e.target.value.toUpperCase())}
                maxLength={50}
                placeholder="e.g. CBN"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Report Name</label>
            <input
              value={form.reportName}
              onChange={(e) => update('reportName', e.target.value)}
              maxLength={200}
              placeholder="Monthly Balance Sheet Return"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => update('frequency', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Format</label>
              <select
                value={form.format}
                onChange={(e) => update('format', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="XLSX">XLSX</option>
                <option value="CSV">CSV</option>
                <option value="PDF">PDF</option>
                <option value="XML">XML</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Data Query (SQL / HQL)</label>
            <textarea
              value={form.sqlQuery}
              onChange={(e) => update('sqlQuery', e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-y"
              placeholder="SELECT ..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.reportCode || !form.reportName || !form.regulator}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Definition
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Definitions Tab ────────────────────────────────────────────────────────────

function DefinitionsTab({
  regulator,
  onGenerate,
  isAdmin,
}: {
  regulator: RegulatorTab;
  onGenerate: (def: RegulatoryReportDefinition) => void;
  isAdmin: boolean;
}) {
  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ['regulatory', 'definitions', regulator],
    queryFn: () =>
      regulator === 'ALL'
        ? regulatoryReportApi.getDefinitions()
        : regulatoryReportApi.getDefinitionsByRegulator(regulator),
  });

  const columns: ColumnDef<RegulatoryReportDefinition, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'reportCode',
        header: 'Report Code',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium">{getValue<string>()}</span>
        ),
      },
      { accessorKey: 'reportName', header: 'Name' },
      { accessorKey: 'regulator', header: 'Regulator' },
      { accessorKey: 'frequency', header: 'Frequency', cell: ({ getValue }) => getValue<string>().replace(/_/g, ' ') },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const cat = getValue<string>() as ReportCategory;
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTHER)}>
              {cat.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      { accessorKey: 'format', header: 'Format' },
      {
        accessorKey: 'active',
        header: 'Active',
        cell: ({ getValue }) => (
          <span className={cn('inline-block w-2 h-2 rounded-full', getValue<boolean>() ? 'bg-green-500' : 'bg-gray-400')} />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => isAdmin ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(row.original);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Play className="w-3 h-3" />
            Generate
          </button>
        ) : null,
      },
    ],
    [onGenerate, isAdmin],
  );

  if (isLoading) return <DataTableSkeleton columns={8} rows={6} />;

  if (definitions.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No report definitions"
        description={regulator === 'ALL' ? 'No regulatory report definitions found.' : `No definitions found for ${regulator}.`}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={definitions}
      enableGlobalFilter
      pageSize={15}
    />
  );
}

// ─── Runs Tab ───────────────────────────────────────────────────────────────────

function RunsTab({ regulator, isAdmin }: { regulator: RegulatorTab; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [selectedCode, setSelectedCode] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: definitions = [] } = useQuery({
    queryKey: ['regulatory', 'definitions', regulator],
    queryFn: () =>
      regulator === 'ALL'
        ? regulatoryReportApi.getDefinitions()
        : regulatoryReportApi.getDefinitionsByRegulator(regulator),
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ['regulatory', 'runs', selectedCode, page, pageSize],
    queryFn: () => regulatoryReportApi.getRuns(selectedCode, { page, size: pageSize }),
    enabled: !!selectedCode,
  });

  const [submitRun, setSubmitRun] = useState<RegulatoryReportRun | null>(null);

  const submitMutation = useMutation({
    mutationFn: (runId: number) => regulatoryReportApi.submitRun(runId),
    onSuccess: () => {
      toast.success('Report submitted to regulator');
      queryClient.invalidateQueries({ queryKey: ['regulatory', 'runs'] });
      setSubmitRun(null);
    },
    onError: () => toast.error('Submission failed'),
  });

  const runColumns: ColumnDef<RegulatoryReportRun, unknown>[] = useMemo(
    () => [
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => (
          <span className="text-sm">
            {formatDate(row.original.periodStart)} - {formatDate(row.original.periodEnd)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'rowCount',
        header: 'Records',
        cell: ({ getValue }) => {
          const v = getValue<number | undefined>();
          return v != null ? v.toLocaleString() : '-';
        },
      },
      {
        accessorKey: 'generatedAt',
        header: 'Generated At',
        cell: ({ getValue }) => {
          const v = getValue<string | undefined>();
          return v ? formatDate(v) : '-';
        },
      },
      {
        accessorKey: 'submittedBy',
        header: 'Submitted By',
        cell: ({ getValue }) => getValue<string | undefined>() ?? '-',
      },
      {
        accessorKey: 'acknowledgementRef',
        header: 'Acknowledgement Ref',
        cell: ({ getValue }) => {
          const v = getValue<string | undefined>();
          return v ? <span className="font-mono text-xs">{v}</span> : '-';
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'GENERATED' && isAdmin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSubmitRun(row.original);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* Report selector */}
      <div className="px-1">
        <label className="text-sm font-medium text-muted-foreground block mb-1.5">Select Report Definition</label>
        <select
          value={selectedCode}
          onChange={(e) => { setSelectedCode(e.target.value); setPage(0); }}
          className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">-- Choose a report --</option>
          {definitions.map((d) => (
            <option key={d.reportCode} value={d.reportCode}>
              {d.reportCode} - {d.reportName}
            </option>
          ))}
        </select>
      </div>

      {!selectedCode && (
        <EmptyState
          icon={FileText}
          title="Select a report"
          description="Choose a report definition above to view run history."
        />
      )}

      {selectedCode && runsLoading && <DataTableSkeleton columns={7} rows={5} />}

      {selectedCode && !runsLoading && runs.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No runs found"
          description={`No generation runs found for ${selectedCode}.`}
        />
      )}

      {selectedCode && !runsLoading && runs.length > 0 && (
        <DataTable
          columns={runColumns}
          data={runs}
          pageSize={pageSize}
        />
      )}

      <ConfirmDialog
        open={submitRun !== null}
        onClose={() => setSubmitRun(null)}
        onConfirm={() => { if (submitRun) submitMutation.mutate(submitRun.id); }}
        title="Submit to Regulator"
        description={`Are you sure you want to submit this report run (${submitRun?.reportCode}, ${submitRun ? formatDate(submitRun.periodStart) : ''} - ${submitRun ? formatDate(submitRun.periodEnd) : ''}) to the regulator? This action cannot be undone.`}
        confirmLabel="Submit"
        isLoading={submitMutation.isPending}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export function RegulatoryReportsPage() {
  useEffect(() => { document.title = 'Regulatory Reports | CBS'; }, []);

  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasRole(userRoles, ['CBS_ADMIN']);

  const [regulator, setRegulator] = useState<RegulatorTab>('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [generateDef, setGenerateDef] = useState<RegulatoryReportDefinition | null>(null);

  return (
    <>
      <PageHeader
        title="Regulatory Reports"
        subtitle="Manage report definitions, generate returns, and submit to regulators"
        actions={
          isAdmin ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Definition
            </button>
          ) : undefined
        }
      />

      <div className="page-container space-y-4">
        {/* Regulator filter tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {REGULATOR_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setRegulator(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                regulator === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <TabsPage
          tabs={[
            {
              id: 'definitions',
              label: 'Definitions',
              content: (
                <div className="p-4">
                  <DefinitionsTab regulator={regulator} onGenerate={setGenerateDef} isAdmin={isAdmin} />
                </div>
              ),
            },
            {
              id: 'runs',
              label: 'Run History',
              content: (
                <div className="p-4">
                  <RunsTab regulator={regulator} isAdmin={isAdmin} />
                </div>
              ),
            },
          ]}
          defaultTab="definitions"
        />
      </div>

      {/* Dialogs */}
      <GenerateDialog
        open={generateDef !== null}
        onClose={() => setGenerateDef(null)}
        definition={generateDef}
      />
      <AddDefinitionDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
