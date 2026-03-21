import { useState } from 'react';
import { AlertTriangle, Plus, X, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import {
  useComplianceReports,
  useOverdueReports,
  useCreateReport,
  useSubmitForReview,
  useSubmitToRegulator,
} from '../hooks/useComplianceReports';
import type { Regulator, ComplianceReport, ReportStatus } from '../api/complianceReportApi';
import { formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_ORDER: ReportStatus[] = ['DRAFT', 'REVIEWED', 'SUBMITTED'];

const STATUS_COLORS: Record<ReportStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  REVIEWED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUBMITTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const REGULATOR_COLORS: Record<Regulator, string> = {
  CBN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  NFIU: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SEC: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  NDIC: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  FATF: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function RegulatorBadge({ regulator }: { regulator: Regulator }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${REGULATOR_COLORS[regulator]}`}>
      {regulator}
    </span>
  );
}

function StatusFlow({ status }: { status: ReportStatus }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-0.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`}
            title={s}
          />
          {i < STATUS_ORDER.length - 1 && (
            <div className={`w-3 h-px ${i < idx ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── New Report Dialog ─────────────────────────────────────────────────────────

interface NewReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reportName: string;
    regulator: Regulator;
    reportType: string;
    reportingPeriod: string;
    periodStartDate: string;
    periodEndDate: string;
    dueDate: string;
    preparedBy: string;
  }) => void;
  isLoading: boolean;
}

function NewReportDialog({ open, onClose, onSubmit, isLoading }: NewReportDialogProps) {
  const [form, setForm] = useState({
    reportName: '',
    regulator: 'CBN' as Regulator,
    reportType: '',
    reportingPeriod: '',
    periodStartDate: '',
    periodEndDate: '',
    dueDate: '',
    preparedBy: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">New Regulatory Report</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Name</label>
            <input
              className="input w-full"
              placeholder="e.g. Monthly BSA Report"
              value={form.reportName}
              onChange={(e) => setForm({ ...form, reportName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Regulator</label>
              <select
                className="input w-full"
                value={form.regulator}
                onChange={(e) => setForm({ ...form, regulator: e.target.value as Regulator })}
              >
                {(['CBN', 'NFIU', 'SEC', 'NDIC', 'FATF'] as Regulator[]).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <input
                className="input w-full"
                placeholder="e.g. Monthly Return"
                value={form.reportType}
                onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reporting Period</label>
              <input
                className="input w-full"
                placeholder="e.g. 2026-02"
                value={form.reportingPeriod}
                onChange={(e) => setForm({ ...form, reportingPeriod: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                className="input w-full"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Period Start</label>
              <input
                type="date"
                className="input w-full"
                value={form.periodStartDate}
                onChange={(e) => setForm({ ...form, periodStartDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Period End</label>
              <input
                type="date"
                className="input w-full"
                value={form.periodEndDate}
                onChange={(e) => setForm({ ...form, periodEndDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prepared By</label>
            <input
              className="input w-full"
              placeholder="Staff ID or username"
              value={form.preparedBy}
              onChange={(e) => setForm({ ...form, preparedBy: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Submit for Review Dialog ──────────────────────────────────────────────────

interface ReviewDialogProps {
  report: ComplianceReport | null;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function ReviewDialog({ report, onClose, onConfirm, isLoading }: ReviewDialogProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Submit for Review</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Submit <span className="font-medium text-foreground">{report.reportName}</span> for compliance review?
          </p>
          <p className="text-xs text-muted-foreground">
            The current user will be recorded as the reviewer.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={onConfirm} className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Submit to Regulator Dialog ────────────────────────────────────────────────

interface RegulatorSubmitDialogProps {
  report: ComplianceReport | null;
  onClose: () => void;
  onSubmit: (submissionReference: string) => void;
  isLoading: boolean;
}

function RegulatorSubmitDialog({ report, onClose, onSubmit, isLoading }: RegulatorSubmitDialogProps) {
  const [submissionRef, setSubmissionRef] = useState('');

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Submit to Regulator</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Submitting <span className="font-medium text-foreground">{report.reportName}</span> to{' '}
            <RegulatorBadge regulator={report.regulator} />
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Submission Reference</label>
            <input
              className="input w-full"
              placeholder="e.g. CBN/2026/Q1/001"
              value={submissionRef}
              onChange={(e) => setSubmissionRef(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={() => onSubmit(submissionRef)}
              className="btn-primary"
              disabled={isLoading || !submissionRef}
            >
              {isLoading ? 'Submitting...' : 'Submit to Regulator'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const REGULATORS: Array<{ value: Regulator | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Regulators' },
  { value: 'CBN', label: 'CBN' },
  { value: 'NFIU', label: 'NFIU' },
  { value: 'SEC', label: 'SEC' },
  { value: 'NDIC', label: 'NDIC' },
  { value: 'FATF', label: 'FATF' },
];

function isOverdue(report: ComplianceReport): boolean {
  return new Date(report.dueDate) < new Date() && report.status !== 'SUBMITTED';
}

function isDueThisWeek(report: ComplianceReport): boolean {
  const due = new Date(report.dueDate);
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return due >= now && due <= weekAhead;
}

export function ComplianceReportsPage() {
  const [selectedRegulator, setSelectedRegulator] = useState<Regulator>('CBN');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ComplianceReport | null>(null);
  const [submitTarget, setSubmitTarget] = useState<ComplianceReport | null>(null);

  const { data: allReports = [], isLoading, isError: reportsError } = useComplianceReports(selectedRegulator);
  const { data: overdueReports = [], isError: overdueError } = useOverdueReports();
  const createReport = useCreateReport();
  const submitForReview = useSubmitForReview();
  const submitToRegulator = useSubmitToRegulator();

  const filteredReports = allReports.filter((r) =>
    statusFilter === 'ALL' ? true : r.status === statusFilter
  );

  const totalReports = allReports.length;
  const overdueCount = overdueReports.length;
  const dueThisWeekCount = allReports.filter(isDueThisWeek).length;

  const now = new Date();
  const submittedThisMonth = allReports.filter((r) => {
    if (r.status !== 'SUBMITTED') return false;
    if (!r.submissionDate) return false;
    const d = new Date(r.submissionDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <>
      <PageHeader
        title="Regulatory Reports"
        subtitle="Manage, track, and submit regulatory compliance reports"
        actions={
          <button onClick={() => setShowNewDialog(true)} className="btn-primary inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Report
          </button>
        }
      />
      <div className="page-container space-y-6">
        {(reportsError || overdueError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Regulatory-report data could not be fully loaded from the backend.
          </div>
        )}

        {!overdueError && overdueCount > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                {overdueCount} overdue report{overdueCount !== 1 ? 's' : ''} require urgent attention
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                These reports have passed their due dates and have not been submitted. Regulatory penalties may apply.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Reports" value={reportsError ? '--' : totalReports} loading={isLoading && !reportsError} />
          <StatCard label="Overdue" value={overdueError ? '--' : overdueCount} />
          <StatCard label="Due This Week" value={reportsError ? '--' : dueThisWeekCount} />
          <StatCard label="Submitted This Month" value={reportsError ? '--' : submittedThisMonth} />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {REGULATORS.map((r) => (
              <button
                key={r.value}
                onClick={() => { if (r.value !== 'ALL') setSelectedRegulator(r.value); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  r.value === selectedRegulator
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            className="input text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Regulator</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Report Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prepared By</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : reportsError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-red-700">
                      Regulatory reports could not be loaded from the backend.
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      No reports found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const overdue = isOverdue(report);
                    return (
                      <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{report.reportCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium truncate max-w-[180px] block">{report.reportName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <RegulatorBadge regulator={report.regulator} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{report.reportType}</td>
                        <td className="px-4 py-3 font-mono text-xs">{report.reportingPeriod}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {overdue && '⚠ '}{formatDate(report.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusFlow status={report.status} />
                        </td>
                        <td className="px-4 py-3">
                          <ReportStatusBadge status={report.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {report.preparedBy}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {report.status === 'DRAFT' && (
                              <button
                                onClick={() => setReviewTarget(report)}
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap"
                              >
                                Submit for Review
                              </button>
                            )}
                            {report.status === 'REVIEWED' && (
                              <button
                                onClick={() => setSubmitTarget(report)}
                                className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                              >
                                Submit to Regulator
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!overdueError && overdueReports.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Overdue Reports — Urgent Action Required
            </h3>
            <div className="space-y-2">
              {overdueReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{report.reportName}</span>
                      <RegulatorBadge regulator={report.regulator} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {formatDate(report.dueDate)} · Period: {report.reportingPeriod}
                    </p>
                  </div>
                  <ReportStatusBadge status={report.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <NewReportDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSubmit={(data) =>
          createReport.mutate(data, {
            onSuccess: () => { setShowNewDialog(false); toast.success('Report created'); },
            onError: () => toast.error('Failed to create report'),
          })
        }
        isLoading={createReport.isPending}
      />

      <ReviewDialog
        report={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onConfirm={() =>
          reviewTarget &&
          submitForReview.mutate(reviewTarget.reportCode, {
            onSuccess: () => { setReviewTarget(null); toast.success('Submitted for review'); },
            onError: () => toast.error('Failed to submit for review'),
          })
        }
        isLoading={submitForReview.isPending}
      />

      <RegulatorSubmitDialog
        report={submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSubmit={(submissionReference) =>
          submitTarget &&
          submitToRegulator.mutate(
            { code: submitTarget.reportCode, submissionReference },
            {
              onSuccess: () => { setSubmitTarget(null); toast.success('Submitted to regulator'); },
              onError: () => toast.error('Failed to submit to regulator'),
            }
          )
        }
        isLoading={submitToRegulator.isPending}
      />
    </>
  );
}
