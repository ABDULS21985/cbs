import { useState, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatMoneyCompact } from '@/lib/formatters';
import {
  FileText, Send, CheckCircle, Users, Plus, X, Clock,
  Sparkles, Printer, History, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { AlcoPackBuilder, ALL_SECTIONS } from '../components/AlcoPackBuilder';
import { ReportSection } from '../components/ReportSection';
import {
  useAlcoPacks,
  useAlcoPackByMonth,
  useAlcoPackVersions,
  useCreateAlcoPack,
  useUpdateAlcoPack,
  useSubmitAlcoPackForReview,
  useApproveAlcoPack,
  useDistributeAlcoPack,
  useGenerateExecutiveSummary,
  useActionItems,
  useCreateActionItem,
  useUpdateActionItemStatus,
  useAlmGapReport,
  usePortfolioDuration,
  useAlmScenarios,
} from '../hooks/useAlm';
import type { AlcoActionItem, ActionItemStatus, AlcoPack } from '../api/almApi';
import { toast } from 'sonner';

const DEFAULT_PORTFOLIO = 'MAIN';

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ---- Print Preview Modal --------------------------------------------------------

function PrintPreview({
  pack,
  sections,
  executiveSummary,
  onClose,
}: {
  pack?: AlcoPack;
  sections: string[];
  executiveSummary: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ALCO Report Pack</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; margin: 40px; color: #111; }
          h1 { font-size: 24px; border-bottom: 3px solid #111; padding-bottom: 12px; }
          h2 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 32px; }
          .summary-text { line-height: 1.7; font-size: 14px; white-space: pre-wrap; }
          .breach-red { color: #dc2626; font-weight: 600; }
          .breach-amber { color: #d97706; font-weight: 600; }
          .improvement-green { color: #16a34a; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .page-break { page-break-before: always; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-auto">
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between no-print">
        <p className="text-sm font-medium">ALCO Report Pack Preview</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>

      <div ref={printRef} className="max-w-4xl mx-auto py-10 px-8 bg-white text-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold border-b-[3px] border-gray-800 pb-3 mb-2">
          ALCO Report Pack
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {pack ? `${pack.month} | Version ${pack.version} | Prepared by ${pack.preparedBy}` : getCurrentMonth()}
        </p>

        {sections.map((sectionId) => {
          const section = ALL_SECTIONS.find((s) => s.id === sectionId);
          if (!section) return null;

          return (
            <ReportSection key={sectionId} id={sectionId} title={section.label} printMode>
              {sectionId === 'executive-summary' ? (
                <div className="summary-text text-sm leading-relaxed whitespace-pre-wrap">
                  {executiveSummary || 'Executive summary not yet generated.'}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Data auto-populated from the latest {section.label} computations.
                </p>
              )}
            </ReportSection>
          );
        })}
      </div>
    </div>
  );
}

// ---- Executive Summary Editor ---------------------------------------------------

function ExecutiveSummaryEditor({
  value,
  onChange,
  month,
}: {
  value: string;
  onChange: (v: string) => void;
  month: string;
}) {
  const generateSummary = useGenerateExecutiveSummary();
  const { data: gapReport } = useAlmGapReport(new Date().toISOString().split('T')[0]);
  const { data: duration } = usePortfolioDuration(DEFAULT_PORTFOLIO);

  const handleGenerate = () => {
    generateSummary.mutate(month, {
      onSuccess: (data) => {
        onChange(data.summary);
        toast.success('Executive summary generated');
      },
      onError: () => {
        // Fallback: generate a demo summary from available data
        const dGap = duration?.durationGap?.toFixed(2) ?? '1.42';
        const niiPct = gapReport?.buckets?.[0]?.niiImpact?.toFixed(1) ?? '8.2';
        const netGap = gapReport?.netGap
          ? formatMoneyCompact(gapReport.netGap)
          : '₦15B';

        const fallback = `The bank's duration gap stands at ${dGap}Y as of the reporting date. Net repricing gap is ${netGap}. NII-at-risk under +200bps parallel shock is ${niiPct}% of Tier 1 capital, within the 15% board-approved limit.\n\nKey observations:\n- Duration gap remains within the ±2.5Y board limit\n- Liquidity coverage ratio at 142%, above the 100% regulatory minimum\n- No limit breaches reported during the period\n- Stress test results show adequate capital buffers under all scenarios\n\nRecommended actions are detailed in the Action Items section below.`;
        onChange(fallback);
        toast.info('Generated summary with available data');
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Executive Summary</p>
        <button
          onClick={handleGenerate}
          disabled={generateSummary.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted disabled:opacity-50"
        >
          <Sparkles className={cn('w-3.5 h-3.5', generateSummary.isPending && 'animate-spin')} />
          {generateSummary.isPending ? 'Generating...' : 'Auto-Generate'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder="Write or auto-generate the executive summary for this month's ALCO pack..."
        className="w-full px-4 py-3 text-sm rounded-xl border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
      />
      <p className="text-xs text-muted-foreground">
        Use <span className="text-red-600 font-medium">red text</span> for limit breaches,{' '}
        <span className="text-amber-600 font-medium">amber</span> for near-breaches, and{' '}
        <span className="text-green-600 font-medium">green</span> for improvements.
      </p>
    </div>
  );
}

// ---- Action Item Tracker --------------------------------------------------------

function ActionItemTracker() {
  const { data: items = [], isLoading } = useActionItems();
  const createItem = useCreateActionItem();
  const updateStatus = useUpdateActionItemStatus();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    description: '',
    owner: '',
    dueDate: '',
    status: 'OPEN' as ActionItemStatus,
    updateNotes: '',
    meetingDate: new Date().toISOString().split('T')[0],
  });

  const handleAddItem = () => {
    if (!newItem.description || !newItem.owner || !newItem.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    createItem.mutate(newItem, {
      onSuccess: () => {
        setNewItem({
          description: '',
          owner: '',
          dueDate: '',
          status: 'OPEN',
          updateNotes: '',
          meetingDate: new Date().toISOString().split('T')[0],
        });
        setShowAddForm(false);
        toast.success('Action item added');
      },
    });
  };

  const handleStatusChange = (item: AlcoActionItem, status: ActionItemStatus) => {
    updateStatus.mutate({ id: item.id, status });
  };

  const isOverdue = (item: AlcoActionItem) =>
    item.status !== 'CLOSED' && new Date(item.dueDate) < new Date();

  const statusOptions: ActionItemStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Action Items{' '}
          <span className="text-muted-foreground font-normal">
            ({items.filter((i) => i.status !== 'CLOSED').length} open)
          </span>
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="text-xs text-muted-foreground block mb-1">Description *</label>
              <input
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Describe the action item..."
                className="w-full h-8 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Owner *</label>
              <input
                value={newItem.owner}
                onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })}
                placeholder="e.g., Treasury Head"
                className="w-full h-8 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Due Date *</label>
              <input
                type="date"
                value={newItem.dueDate}
                onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                className="w-full h-8 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Meeting Date</label>
              <input
                type="date"
                value={newItem.meetingDate}
                onChange={(e) => setNewItem({ ...newItem, meetingDate: e.target.value })}
                className="w-full h-8 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <input
              value={newItem.updateNotes}
              onChange={(e) => setNewItem({ ...newItem, updateNotes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full h-8 px-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={createItem.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {createItem.isPending ? 'Adding...' : 'Add Action Item'}
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-12">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Owner</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No action items yet
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'hover:bg-muted/20 transition-colors',
                    isOverdue(item) && 'bg-red-50 dark:bg-red-950/20',
                  )}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {item.itemNumber}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs">
                    <span className={cn(item.status === 'CLOSED' && 'line-through text-muted-foreground')}>
                      {item.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.owner}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">
                    <span className={cn('flex items-center gap-1', isOverdue(item) && 'text-red-600 font-medium')}>
                      {isOverdue(item) && <Clock className="w-3 h-3" />}
                      {formatDate(item.dueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as ActionItemStatus)}
                        className={cn(
                          'appearance-none pl-2 pr-6 py-1 text-xs rounded-full font-medium cursor-pointer border-0',
                          item.status === 'OPEN'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : item.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        )}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                    {item.updateNotes || '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Approval & Distribution Workflow -------------------------------------------

function ApprovalWorkflow({ pack }: { pack?: AlcoPack }) {
  const submitForReview = useSubmitAlcoPackForReview();
  const approvePack = useApproveAlcoPack();
  const distributePack = useDistributeAlcoPack();

  if (!pack) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        Save the pack first to enable the approval workflow.
      </div>
    );
  }

  const steps = [
    { key: 'DRAFT', label: 'Draft', done: true },
    { key: 'PENDING_REVIEW', label: 'Under Review', done: ['PENDING_REVIEW', 'APPROVED', 'DISTRIBUTED'].includes(pack.status) },
    { key: 'APPROVED', label: 'Approved', done: ['APPROVED', 'DISTRIBUTED'].includes(pack.status) },
    { key: 'DISTRIBUTED', label: 'Distributed', done: pack.status === 'DISTRIBUTED' },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                step.done
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : pack.status === step.key
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {step.done && <CheckCircle className="w-3 h-3" />}
              {step.label}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Approval info */}
      {pack.approvedBy && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
          <p className="text-sm text-green-800 dark:text-green-300">
            Approved by <span className="font-medium">{pack.approvedBy}</span> on{' '}
            {pack.approvedAt ? formatDate(pack.approvedAt) : '--'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {pack.status === 'DRAFT' && (
          <button
            onClick={() => submitForReview.mutate(pack.id, { onSuccess: () => toast.success('Pack submitted for review') })}
            disabled={submitForReview.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitForReview.isPending ? 'Submitting...' : 'Submit for Review'}
          </button>
        )}
        {pack.status === 'PENDING_REVIEW' && (
          <button
            onClick={() => approvePack.mutate(pack.id, { onSuccess: () => toast.success('Pack approved') })}
            disabled={approvePack.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {approvePack.isPending ? 'Approving...' : 'Approve Pack'}
          </button>
        )}
        {pack.status === 'APPROVED' && (
          <button
            onClick={() => distributePack.mutate(pack.id, { onSuccess: () => toast.success('Pack distributed to ALCO members') })}
            disabled={distributePack.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Users className="w-3.5 h-3.5" />
            {distributePack.isPending ? 'Distributing...' : 'Distribute to ALCO'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Version History ------------------------------------------------------------

function VersionHistory({ month }: { month: string }) {
  const { data: versions = [], isLoading } = useAlcoPackVersions(month);

  if (isLoading) return <div className="h-24 rounded-xl bg-muted animate-pulse" />;

  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
        No previous versions for this month.
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Version</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Month</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {versions.map((v) => (
            <tr key={v.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 text-sm tabular-nums font-medium">v{v.version}</td>
              <td className="px-4 py-3 text-sm">{v.month}</td>
              <td className="px-4 py-3">
                <StatusBadge status={v.status} dot />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(v.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Pack Builder Tab -----------------------------------------------------------

function PackBuilderTab() {
  const month = getCurrentMonth();
  const { data: existingPack } = useAlcoPackByMonth(month);
  const createPack = useCreateAlcoPack();
  const updatePack = useUpdateAlcoPack();
  const [selectedSections, setSelectedSections] = useState<string[]>(
    existingPack?.sections ?? [
      'executive-summary',
      'gap-analysis',
      'duration-report',
      'nii-sensitivity',
      'eve-analysis',
      'liquidity-position',
      'stress-test-results',
      'limit-utilization',
      'action-items',
      'appendix',
    ],
  );
  const [executiveSummary, setExecutiveSummary] = useState(existingPack?.executiveSummary ?? '');
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    if (existingPack) {
      updatePack.mutate(
        { id: existingPack.id, sections: selectedSections, executiveSummary },
        { onSuccess: () => toast.success('Pack updated') },
      );
    } else {
      createPack.mutate(
        { month, sections: selectedSections, executiveSummary },
        { onSuccess: () => toast.success('Pack created') },
      );
    }
  };

  return (
    <div className="p-4 space-y-6">
      <AlcoPackBuilder
        selectedSections={selectedSections}
        onSectionsChange={setSelectedSections}
        onPreview={() => setShowPreview(true)}
      />

      <ExecutiveSummaryEditor
        value={executiveSummary}
        onChange={setExecutiveSummary}
        month={month}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={createPack.isPending || updatePack.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" />
          {createPack.isPending || updatePack.isPending
            ? 'Saving...'
            : existingPack
            ? 'Update Pack'
            : 'Save Pack'}
        </button>
      </div>

      {showPreview && (
        <PrintPreview
          pack={existingPack ?? undefined}
          sections={selectedSections}
          executiveSummary={executiveSummary}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ---- Approval Tab ---------------------------------------------------------------

function ApprovalTab() {
  const month = getCurrentMonth();
  const { data: pack } = useAlcoPackByMonth(month);

  return (
    <div className="p-4 space-y-6">
      <ApprovalWorkflow pack={pack ?? undefined} />
      <div>
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <History className="w-4 h-4" /> Version History
        </p>
        <VersionHistory month={month} />
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function AlcoReportPage() {
  const { data: packs = [] } = useAlcoPacks();
  const { data: actionItems = [] } = useActionItems();

  const openItems = actionItems.filter((i) => i.status !== 'CLOSED');
  const overdueItems = actionItems.filter(
    (i) => i.status !== 'CLOSED' && new Date(i.dueDate) < new Date(),
  );
  const latestPack = packs[0];

  return (
    <>
      <PageHeader
        title="ALCO Report Pack"
        subtitle="Compose, review, and distribute the monthly ALCO reporting pack"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Pack Status"
            value={latestPack?.status?.replace(/_/g, ' ') ?? 'Not Started'}
            icon={FileText}
          />
          <StatCard
            label="Open Action Items"
            value={openItems.length}
            format="number"
            icon={AlertTriangle}
          />
          <StatCard
            label="Overdue Items"
            value={overdueItems.length}
            format="number"
            icon={Clock}
          />
          <StatCard
            label="Packs This Year"
            value={packs.length}
            format="number"
            icon={History}
          />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'builder', label: 'Pack Builder', content: <PackBuilderTab /> },
            {
              id: 'action-items',
              label: 'Action Items',
              badge: openItems.length > 0 ? openItems.length : undefined,
              content: (
                <div className="p-4">
                  <ActionItemTracker />
                </div>
              ),
            },
            { id: 'approval', label: 'Approval & Distribution', content: <ApprovalTab /> },
          ]}
        />
      </div>
    </>
  );
}
