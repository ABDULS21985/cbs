import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Loader2, FileText, Eye, CheckCircle, Send, AlertTriangle, ClipboardList, BarChart3, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, EmptyState, DataTableSkeleton, ConfirmDialog, TabsPage, StatCard } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import type { ComplianceReport } from '../api/complianceReportApi';
import {
  useComplianceStats,
  useComplianceReports,
  useOverdueComplianceReports,
  useComplianceReturns,
  useComplianceAssessments,
  useCreateComplianceReport,
  useReviewComplianceReport,
  useSubmitComplianceReport,
} from '../hooks/useComplianceReports';

// ─── Constants ──────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  'STATUTORY_RETURN', 'PRUDENTIAL_REPORT', 'AML_CTF_REPORT', 'LIQUIDITY_REPORT',
  'CAPITAL_ADEQUACY', 'LARGE_EXPOSURE', 'RISK_ASSESSMENT', 'CONSUMER_COMPLAINT',
  'FRAUD_REPORT', 'TAX_FILING',
] as const;

const REGULATORS = ['CBN', 'NDIC', 'SEC', 'NAICOM', 'FIRS', 'NFIU', 'FRC', 'PENCOM'] as const;

const REPORTING_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC'] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  REVIEWED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUBMITTED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  STATUTORY_RETURN: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PRUDENTIAL_REPORT: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  AML_CTF_REPORT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  LIQUIDITY_REPORT: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CAPITAL_ADEQUACY: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LARGE_EXPOSURE: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  RISK_ASSESSMENT: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  CONSUMER_COMPLAINT: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  FRAUD_REPORT: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  TAX_FILING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const REGULATOR_COLORS: Record<string, string> = {
  CBN: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  NDIC: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SEC: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  NAICOM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FIRS: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NFIU: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  FRC: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PENCOM: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

// ─── Create Dialog ──────────────────────────────────────────────────────────────

function CreateReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    reportName: '',
    reportType: 'STATUTORY_RETURN',
    regulator: 'CBN',
    reportingPeriod: 'MONTHLY',
    dueDate: '',
    notes: '',
  });

  const createMutation = useCreateComplianceReport();

  if (!open) return null;

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleCreate = () => {
    const reportCode = `${form.regulator}-${form.reportType.substring(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    createMutation.mutate(
      {
        reportCode,
        reportName: form.reportName,
        reportType: form.reportType,
        regulator: form.regulator,
        reportingPeriod: form.reportingPeriod,
        dueDate: form.dueDate,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setForm({ reportName: '', reportType: 'STATUTORY_RETURN', regulator: 'CBN', reportingPeriod: 'MONTHLY', dueDate: '', notes: '' });
          onClose();
        },
      },
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold">Create Compliance Report</h3>

          <div>
            <label className="text-sm font-medium block mb-1">Report Name</label>
            <input
              value={form.reportName}
              onChange={(e) => update('reportName', e.target.value)}
              maxLength={200}
              placeholder="e.g. Monthly Prudential Return"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Report Type</label>
              <select
                value={form.reportType}
                onChange={(e) => update('reportType', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Regulator</label>
              <select
                value={form.regulator}
                onChange={(e) => update('regulator', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {REGULATORS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Reporting Period</label>
              <select
                value={form.reportingPeriod}
                onChange={(e) => update('reportingPeriod', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {REPORTING_PERIODS.map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-y"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !form.reportName || !form.dueDate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Report
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Submit Dialog ──────────────────────────────────────────────────────────────

function SubmitDialog({
  open,
  onClose,
  report,
}: {
  open: boolean;
  onClose: () => void;
  report: ComplianceReport | null;
}) {
  const [submissionReference, setSubmissionReference] = useState('');
  const submitMutation = useSubmitComplianceReport();

  if (!open || !report) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <h3 className="text-lg font-semibold">Submit Report</h3>
          <p className="text-sm text-muted-foreground">
            Submit <span className="font-medium text-foreground">{report.reportName}</span> ({report.reportCode}) to {report.regulator}.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">Submission Reference</label>
            <input
              value={submissionReference}
              onChange={(e) => setSubmissionReference(e.target.value)}
              placeholder="e.g. REF-2026-001"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={submitMutation.isPending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                submitMutation.mutate(
                  { code: report.reportCode, submissionReference },
                  {
                    onSuccess: () => {
                      setSubmissionReference('');
                      onClose();
                    },
                  },
                )
              }
              disabled={submitMutation.isPending || !submissionReference}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────────

function DetailPanel({
  open,
  onClose,
  report,
}: {
  open: boolean;
  onClose: () => void;
  report: ComplianceReport | null;
}) {
  if (!open || !report) return null;

  const fields = [
    { label: 'Report Code', value: report.reportCode },
    { label: 'Report Name', value: report.reportName },
    { label: 'Report Type', value: report.reportType.replace(/_/g, ' ') },
    { label: 'Regulator', value: report.regulator },
    { label: 'Reporting Period', value: report.reportingPeriod.replace(/_/g, ' ') },
    { label: 'Due Date', value: formatDate(report.dueDate) },
    { label: 'Status', value: report.status },
    { label: 'Submission Reference', value: report.submissionReference ?? '-' },
    { label: 'Submitted At', value: report.submittedAt ? formatDate(report.submittedAt) : '-' },
    { label: 'Submitted By', value: report.submittedBy ?? '-' },
    { label: 'Reviewed At', value: report.reviewedAt ? formatDate(report.reviewedAt) : '-' },
    { label: 'Reviewed By', value: report.reviewedBy ?? '-' },
    { label: 'Notes', value: report.notes ?? '-' },
    { label: 'Created At', value: report.createdAt ? formatDate(report.createdAt) : '-' },
    { label: 'Updated At', value: report.updatedAt ? formatDate(report.updatedAt) : '-' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Report Details</h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</dt>
                <dd className="text-sm mt-0.5">
                  {f.label === 'Status' ? (
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[f.value] ?? 'bg-gray-100 text-gray-600')}>
                      {f.value}
                    </span>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Report Table ───────────────────────────────────────────────────────────────

function ReportTable({
  data,
  isLoading,
  emptyTitle,
  emptyDescription,
  isAdmin,
  onReview,
  onSubmit,
  onViewDetails,
}: {
  data: ComplianceReport[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  isAdmin: boolean;
  onReview: (report: ComplianceReport) => void;
  onSubmit: (report: ComplianceReport) => void;
  onViewDetails: (report: ComplianceReport) => void;
}) {
  const columns: ColumnDef<ComplianceReport, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'reportCode',
        header: 'Report Code',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium">{getValue<string>()}</span>
        ),
      },
      { accessorKey: 'reportName', header: 'Report Name' },
      {
        accessorKey: 'reportType',
        header: 'Report Type',
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', REPORT_TYPE_COLORS[val] ?? 'bg-gray-100 text-gray-600')}>
              {val.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'regulator',
        header: 'Regulator',
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', REGULATOR_COLORS[val] ?? 'bg-gray-100 text-gray-600')}>
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: 'reportingPeriod',
        header: 'Reporting Period',
        cell: ({ getValue }) => getValue<string>().replace(/_/g, ' '),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const report = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {isAdmin && report.status === 'DRAFT' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReview(report); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  Review
                </button>
              )}
              {isAdmin && report.status === 'REVIEWED' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSubmit(report); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  Submit
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(report); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            </div>
          );
        },
      },
    ],
    [isAdmin, onReview, onSubmit, onViewDetails],
  );

  if (isLoading) return <DataTableSkeleton columns={8} rows={6} />;

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      enableGlobalFilter
      pageSize={15}
    />
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export function ComplianceReportManagementPage() {
  useEffect(() => { document.title = 'Compliance Reports | CBS'; }, []);

  const user = useAuthStore((s) => s.user);
  const userRoles = user?.roles ?? [];
  const isAdmin = hasPermission(userRoles, 'reports', 'create');

  const [showCreate, setShowCreate] = useState(false);
  const [submitReport, setSubmitReport] = useState<ComplianceReport | null>(null);
  const [detailReport, setDetailReport] = useState<ComplianceReport | null>(null);

  const { data: stats, isLoading: statsLoading } = useComplianceStats();
  const { data: allReports = [], isLoading: allLoading } = useComplianceReports();
  const { data: overdueReports = [], isLoading: overdueLoading } = useOverdueComplianceReports();
  const { data: returns = [], isLoading: returnsLoading } = useComplianceReturns();
  const { data: assessments = [], isLoading: assessmentsLoading } = useComplianceAssessments();

  const reviewMutation = useReviewComplianceReport();
  const [reviewTarget, setReviewTarget] = useState<ComplianceReport | null>(null);

  const handleReview = (report: ComplianceReport) => setReviewTarget(report);

  const confirmReview = () => {
    if (reviewTarget) {
      reviewMutation.mutate(reviewTarget.reportCode, {
        onSuccess: () => setReviewTarget(null),
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Compliance Reports"
        subtitle="Create, review, and submit compliance reports to regulators"
        actions={
          isAdmin ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Report
            </button>
          ) : undefined
        }
      />

      <div className="page-container space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Reports"
            value={stats?.total}
            format="number"
            icon={FileText}
            iconBg="bg-primary/10 dark:bg-primary/20"
            iconColor="text-primary"
            loading={statsLoading}
          />
          <StatCard
            label="Overdue"
            value={stats?.overdue}
            format="number"
            icon={AlertTriangle}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            loading={statsLoading}
          />
          <StatCard
            label="Draft"
            value={stats?.draft}
            format="number"
            icon={ClipboardList}
            iconBg="bg-yellow-100 dark:bg-yellow-900/30"
            iconColor="text-yellow-600 dark:text-yellow-400"
            loading={statsLoading}
          />
          <StatCard
            label="Submitted"
            value={stats?.submitted}
            format="number"
            icon={BarChart3}
            iconBg="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            loading={statsLoading}
          />
        </div>

        {/* Tabs */}
        <TabsPage
          tabs={[
            {
              id: 'all',
              label: 'All Reports',
              content: (
                <div className="p-4">
                  <ReportTable
                    data={allReports}
                    isLoading={allLoading}
                    emptyTitle="No compliance reports"
                    emptyDescription="No compliance reports have been created yet."
                    isAdmin={isAdmin}
                    onReview={handleReview}
                    onSubmit={setSubmitReport}
                    onViewDetails={setDetailReport}
                  />
                </div>
              ),
            },
            {
              id: 'overdue',
              label: 'Overdue',
              content: (
                <div className="p-4">
                  <ReportTable
                    data={overdueReports}
                    isLoading={overdueLoading}
                    emptyTitle="No overdue reports"
                    emptyDescription="All compliance reports are on schedule."
                    isAdmin={isAdmin}
                    onReview={handleReview}
                    onSubmit={setSubmitReport}
                    onViewDetails={setDetailReport}
                  />
                </div>
              ),
            },
            {
              id: 'returns',
              label: 'Returns',
              content: (
                <div className="p-4">
                  <ReportTable
                    data={returns}
                    isLoading={returnsLoading}
                    emptyTitle="No submitted returns"
                    emptyDescription="No compliance returns have been submitted yet."
                    isAdmin={isAdmin}
                    onReview={handleReview}
                    onSubmit={setSubmitReport}
                    onViewDetails={setDetailReport}
                  />
                </div>
              ),
            },
            {
              id: 'assessments',
              label: 'Assessments',
              content: (
                <div className="p-4">
                  <ReportTable
                    data={assessments}
                    isLoading={assessmentsLoading}
                    emptyTitle="No risk assessments"
                    emptyDescription="No risk assessment reports have been created yet."
                    isAdmin={isAdmin}
                    onReview={handleReview}
                    onSubmit={setSubmitReport}
                    onViewDetails={setDetailReport}
                  />
                </div>
              ),
            },
          ]}
          defaultTab="all"
        />
      </div>

      {/* Dialogs */}
      <CreateReportDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <SubmitDialog open={submitReport !== null} onClose={() => setSubmitReport(null)} report={submitReport} />
      <DetailPanel open={detailReport !== null} onClose={() => setDetailReport(null)} report={detailReport} />
      <ConfirmDialog
        open={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        onConfirm={confirmReview}
        title="Review Compliance Report"
        description={`Are you sure you want to mark "${reviewTarget?.reportName}" (${reviewTarget?.reportCode}) as reviewed? This will allow it to be submitted to the regulator.`}
        confirmLabel="Review"
        isLoading={reviewMutation.isPending}
      />
    </>
  );
}
