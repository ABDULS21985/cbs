import { useState, useCallback, useMemo } from 'react';
import { X, Users, ArrowUpCircle, Filter, ChevronRight } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { useNotificationStore } from '@/stores/notificationStore';
import { BreakResolutionForm } from '../components/BreakResolutionForm';
import { BreakTimeline } from '../components/BreakTimeline';
import { EscalationPanel } from '../components/EscalationPanel';
import {
  useBreaks,
  useBreakTimeline,
  useResolveBreak,
  useEscalateBreak,
  useAddBreakNote,
  useBulkAssignBreaks,
  useBulkEscalateBreaks,
} from '../hooks/useReconciliation';
import {
  type BreakItem,
  type BreakStatus,
  type ReconciliationEntry,
} from '../api/reconciliationApi';

type DetailTab = 'details' | 'resolution' | 'timeline' | 'escalation';

const STATUS_OPTIONS: Array<{ value: BreakStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'WRITTEN_OFF', label: 'Written Off' },
];

const AGING_BUCKETS = [
  { value: '', label: 'All Ages' },
  { value: '0-7', label: '0-7 days' },
  { value: '8-30', label: '8-30 days' },
  { value: '31-60', label: '31-60 days' },
  { value: '60+', label: '60+ days' },
];

export function BreakManagementPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [selectedBreak, setSelectedBreak] = useState<BreakItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('details');

  // Filters
  const [statusFilter, setStatusFilter] = useState<BreakStatus | ''>('');
  const [agingFilter, setAgingFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk actions
  const [selectedRows, setSelectedRows] = useState<BreakItem[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  // React Query hooks
  const queryParams = useMemo(() => {
    const p: { status?: BreakStatus; currency?: string; assignedTo?: string } = {};
    if (statusFilter) p.status = statusFilter;
    if (currencyFilter) p.currency = currencyFilter;
    if (assignedToFilter) p.assignedTo = assignedToFilter;
    return p;
  }, [statusFilter, currencyFilter, assignedToFilter]);

  const { data: breaks = [], isLoading: loading } = useBreaks(queryParams);
  const { data: timeline = [], isLoading: timelineLoading } = useBreakTimeline(selectedBreak?.id ?? '');
  const resolveMutation = useResolveBreak();
  const escalateMutation = useEscalateBreak();
  const addNoteMutation = useAddBreakNote();
  const bulkAssignMutation = useBulkAssignBreaks();
  const bulkEscalateMutation = useBulkEscalateBreaks();

  // Filtered breaks by aging
  const filteredBreaks = useMemo(() => {
    if (!agingFilter) return breaks;
    return breaks.filter((b) => {
      if (agingFilter === '0-7') return b.agingDays <= 7;
      if (agingFilter === '8-30') return b.agingDays >= 8 && b.agingDays <= 30;
      if (agingFilter === '31-60') return b.agingDays >= 31 && b.agingDays <= 60;
      if (agingFilter === '60+') return b.agingDays > 60;
      return true;
    });
  }, [breaks, agingFilter]);

  const openDetail = useCallback((breakItem: BreakItem) => {
    setSelectedBreak(breakItem);
    setDetailTab('details');
  }, []);

  const handleResolve = useCallback(
    (data: any) => {
      if (!selectedBreak) return;
      resolveMutation.mutate(
        {
          breakId: selectedBreak.id,
          data: {
            resolutionType: data.resolutionType === 'WRITE_OFF' ? 'WRITE_OFF' : data.resolutionType === 'JOURNAL_ENTRY' ? 'CORRECTION' : 'ESCALATE',
            reason: data.reason,
            glAccount: data.glAccount,
          },
        },
        {
          onSuccess: () => {
            addToast({ type: 'success', title: 'Break Resolved', message: `Break for ${selectedBreak.accountNumber} resolved successfully.` });
            setSelectedBreak(null);
          },
          onError: () => {
            addToast({ type: 'error', title: 'Resolution Failed', message: 'Failed to resolve break. Please try again.' });
          },
        },
      );
    },
    [selectedBreak, resolveMutation, addToast],
  );

  const handleEscalate = useCallback(
    (notes: string) => {
      if (!selectedBreak) return;
      escalateMutation.mutate(
        { breakId: selectedBreak.id, notes },
        {
          onSuccess: () => {
            addToast({ type: 'success', title: 'Break Escalated', message: `Break escalated to next level.` });
            setSelectedBreak(null);
          },
          onError: () => {
            addToast({ type: 'error', title: 'Escalation Failed', message: 'Failed to escalate break.' });
          },
        },
      );
    },
    [selectedBreak, escalateMutation, addToast],
  );

  const handleAddNote = useCallback(
    (notes: string) => {
      if (!selectedBreak) return;
      addNoteMutation.mutate(
        { breakId: selectedBreak.id, notes },
        {
          onSuccess: () => {
            addToast({ type: 'success', title: 'Note Added', message: 'Timeline note added successfully.' });
          },
        },
      );
    },
    [selectedBreak, addNoteMutation, addToast],
  );

  const handleBulkAssign = useCallback(() => {
    if (!bulkAssignee.trim() || selectedRows.length === 0) return;
    bulkAssignMutation.mutate(
      { breakIds: selectedRows.map((r) => r.id), assignedTo: bulkAssignee.trim() },
      {
        onSuccess: () => {
          addToast({ type: 'success', title: 'Breaks Assigned', message: `${selectedRows.length} breaks assigned to ${bulkAssignee}.` });
          setBulkAssignee('');
          setShowBulkAssign(false);
          setSelectedRows([]);
        },
        onError: () => {
          addToast({ type: 'error', title: 'Assignment Failed', message: 'Failed to assign breaks.' });
        },
      },
    );
  }, [bulkAssignee, selectedRows, bulkAssignMutation, addToast]);

  const handleBulkEscalate = useCallback(() => {
    if (selectedRows.length === 0) return;
    bulkEscalateMutation.mutate(
      { breakIds: selectedRows.map((r) => r.id), notes: 'Bulk escalation from break management' },
      {
        onSuccess: () => {
          addToast({ type: 'success', title: 'Breaks Escalated', message: `${selectedRows.length} breaks escalated.` });
          setSelectedRows([]);
        },
        onError: () => {
          addToast({ type: 'error', title: 'Escalation Failed', message: 'Failed to escalate breaks.' });
        },
      },
    );
  }, [selectedRows, bulkEscalateMutation, addToast]);

  // Build a synthetic ReconciliationEntry for the resolution form
  const buildResolutionEntry = (brk: BreakItem): ReconciliationEntry => ({
    id: brk.id,
    date: brk.detectedDate,
    reference: brk.ourEntry?.reference ?? brk.bankEntry?.reference ?? '',
    description: brk.ourEntry?.description ?? brk.bankEntry?.description ?? '',
    amount: brk.amount,
    type: brk.direction === 'C' ? 'CREDIT' : 'DEBIT',
    status: 'UNMATCHED',
  });

  const columns = useMemo<ColumnDef<BreakItem, any>[]>(
    () => [
      {
        accessorKey: 'accountNumber',
        header: 'Account',
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
      },
      { accessorKey: 'bankName', header: 'Bank' },
      { accessorKey: 'currency', header: 'CCY', size: 60 },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-mono text-xs',
              row.original.direction === 'C'
                ? 'text-green-700 dark:text-green-400'
                : 'text-foreground',
            )}
          >
            {row.original.direction === 'C' ? '+' : '-'}
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'agingDays',
        header: 'Aging',
        cell: ({ getValue }) => {
          const days = getValue() as number;
          return (
            <span
              className={cn(
                'text-xs font-medium',
                days > 30 ? 'text-red-600 dark:text-red-400' : days > 7 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
              )}
            >
              {days}d
            </span>
          );
        },
      },
      { accessorKey: 'assignedTo', header: 'Assigned To' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} dot />,
      },
      {
        id: 'open',
        header: '',
        size: 36,
        cell: () => <ChevronRight className="w-4 h-4 text-muted-foreground" />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Break Management"
        subtitle="Investigate, resolve, and escalate reconciliation breaks"
        backTo="/accounts/reconciliation"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                showFilters ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted',
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="surface-card p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BreakStatus | '')}
                className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {AGING_BUCKETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                placeholder="Currency..."
                className="rounded-lg border bg-background px-3 py-2 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                placeholder="Assigned to..."
                className="rounded-lg border bg-background px-3 py-2 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={() => {
                  setStatusFilter('');
                  setAgingFilter('');
                  setCurrencyFilter('');
                  setAssignedToFilter('');
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 text-xs">
            <span className="font-medium">{selectedRows.length} selected</span>
            <div className="flex items-center gap-2 ml-auto">
              {showBulkAssign ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    placeholder="Assignee name..."
                    className="rounded border bg-background px-2 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkAssignee.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                  >
                    Assign
                  </button>
                  <button onClick={() => setShowBulkAssign(false)} className="p-1 hover:bg-muted rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  Bulk Assign
                </button>
              )}
              <button
                onClick={handleBulkEscalate}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                Bulk Escalate
              </button>
            </div>
          </div>
        )}

        {/* Main content: table + slide-over */}
        <div className="flex gap-0">
          {/* Table */}
          <div className={cn('flex-1 min-w-0 transition-all', selectedBreak && 'pr-4')}>
            <DataTable
              columns={columns}
              data={filteredBreaks}
              isLoading={loading}
              enableRowSelection
              onRowSelectionChange={setSelectedRows}
              onRowClick={openDetail}
              enableGlobalFilter
              pageSize={20}
              emptyMessage="No breaks found matching the selected filters"
            />
          </div>

          {/* Detail Slide-over */}
          {selectedBreak && (
            <div className="w-[480px] flex-shrink-0 surface-card overflow-hidden animate-in slide-in-from-right-4">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div>
                  <p className="text-sm font-semibold">Break Detail</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBreak.accountNumber} &middot; {selectedBreak.bankName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBreak(null)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Tabs */}
              <div className="flex border-b">
                {(
                  [
                    { id: 'details', label: 'Details' },
                    { id: 'resolution', label: 'Resolution' },
                    { id: 'timeline', label: 'Timeline' },
                    { id: 'escalation', label: 'Escalation' },
                  ] as Array<{ id: DetailTab; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={cn(
                      'flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                      detailTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Detail Content */}
              <div className="p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
                {detailTab === 'details' && (
                  <div className="space-y-4">
                    {/* Our Entry */}
                    <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                      <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Our Entry
                      </p>
                      {selectedBreak.ourEntry ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{formatDate(selectedBreak.ourEntry.date)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reference</p>
                            <p className="font-mono">{selectedBreak.ourEntry.reference}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-mono font-semibold">
                              {formatMoney(selectedBreak.ourEntry.amount, selectedBreak.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p>{selectedBreak.ourEntry.type}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Description</p>
                            <p>{selectedBreak.ourEntry.description}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No matching entry on our side</p>
                      )}
                    </div>

                    {/* Bank Entry */}
                    <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                      <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Bank Entry
                      </p>
                      {selectedBreak.bankEntry ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{formatDate(selectedBreak.bankEntry.date)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Reference</p>
                            <p className="font-mono">{selectedBreak.bankEntry.reference}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-mono font-semibold">
                              {formatMoney(selectedBreak.bankEntry.amount, selectedBreak.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p>{selectedBreak.bankEntry.type}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Description</p>
                            <p>{selectedBreak.bankEntry.description}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No matching entry from the bank</p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <p className="text-muted-foreground">Break Amount</p>
                        <p className="font-mono font-bold text-lg mt-0.5">
                          {formatMoney(selectedBreak.amount, selectedBreak.currency)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <p className="text-muted-foreground">Aging</p>
                        <p
                          className={cn(
                            'font-bold text-lg mt-0.5',
                            selectedBreak.agingDays > 30
                              ? 'text-red-600'
                              : selectedBreak.agingDays > 7
                                ? 'text-amber-600'
                                : 'text-foreground',
                          )}
                        >
                          {selectedBreak.agingDays} days
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'resolution' && (
                  <BreakResolutionForm
                    entry={buildResolutionEntry(selectedBreak)}
                    onSubmit={handleResolve}
                    onCancel={() => setDetailTab('details')}
                  />
                )}

                {detailTab === 'timeline' && (
                  <div>
                    {timelineLoading ? (
                      <div className="text-center text-xs text-muted-foreground py-8">Loading timeline...</div>
                    ) : timeline.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-8">No timeline events yet.</div>
                    ) : (
                      <BreakTimeline events={timeline} onAddNote={handleAddNote} />
                    )}
                  </div>
                )}

                {detailTab === 'escalation' && (
                  <EscalationPanel breakItem={selectedBreak} onEscalate={handleEscalate} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
