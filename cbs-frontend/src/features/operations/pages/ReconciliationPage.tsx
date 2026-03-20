import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeftRight, Plus, Zap, X, CheckCircle, ListChecks,
  FileText, Landmark, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ReconType = 'NOSTRO' | 'VOSTRO' | 'INTERBANK' | 'GL';
type SessionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type MatchStatus = 'MATCHED' | 'UNMATCHED' | 'WRITTEN_OFF';
type NostroStatus = 'RECONCILED' | 'PENDING' | 'BREAK';

interface ReconSession {
  id: string;
  sessionId: string;
  type: ReconType;
  accountCode: string;
  counterparty: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  status: SessionStatus;
  createdAt: string;
}

interface ReconRecord {
  id: string;
  reference: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  matchStatus: MatchStatus;
  matchedRef?: string;
}

interface NostroAccount {
  id: string;
  accountCode: string;
  bankName: string;
  currency: string;
  ourBalance: number;
  theirBalance: number;
  difference: number;
  lastReconciled: string;
  status: NostroStatus;
}

// ─── API ────────────────────────────────────────────────────────────────────────

const reconApi = {
  getSessions: () => apiGet<ReconSession[]>('/api/v1/reconciliation/sessions'),
  createSession: (data: {
    type: ReconType;
    accountCode: string;
    counterparty: string;
    currency: string;
    periodStart: string;
    periodEnd: string;
  }) => apiPost<ReconSession>('/api/v1/reconciliation/sessions', data),
  autoMatch: (sessionId: string) =>
    apiPost<ReconSession>(`/api/v1/reconciliation/sessions/${sessionId}/auto-match`),
  autoMatchAll: () =>
    apiPost<{ matched: number }>('/api/v1/reconciliation/auto-match-all'),
  completeSession: (sessionId: string) =>
    apiPost<ReconSession>(`/api/v1/reconciliation/sessions/${sessionId}/complete`),
  getOurRecords: (sessionId: string) =>
    apiGet<ReconRecord[]>(`/api/v1/reconciliation/sessions/${sessionId}/our-records`),
  getCounterpartyRecords: (sessionId: string) =>
    apiGet<ReconRecord[]>(`/api/v1/reconciliation/sessions/${sessionId}/counterparty-records`),
  manualMatch: (sessionId: string, ourId: string, theirId: string) =>
    apiPost<void>(`/api/v1/reconciliation/sessions/${sessionId}/manual-match`, { ourId, theirId }),
  writeOff: (sessionId: string, recordId: string, reason: string) =>
    apiPost<void>(`/api/v1/reconciliation/sessions/${sessionId}/write-off`, { recordId, reason }),
  getNostroAccounts: () =>
    apiGet<NostroAccount[]>('/api/v1/reconciliation/nostro-accounts'),
};

const KEYS = {
  sessions: ['recon', 'sessions'] as const,
  nostro: ['recon', 'nostro'] as const,
  ourRecords: (id: string) => ['recon', 'our-records', id] as const,
  theirRecords: (id: string) => ['recon', 'their-records', id] as const,
};

// ─── Type Badge ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ReconType, string> = {
  NOSTRO: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VOSTRO: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INTERBANK: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  GL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function TypeBadge({ type }: { type: ReconType }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[type])}>
      {type}
    </span>
  );
}

// ─── Sessions Tab ───────────────────────────────────────────────────────────────

function SessionsTab() {
  const qc = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: KEYS.sessions,
    queryFn: reconApi.getSessions,
    staleTime: 15_000,
  });

  const autoMatch = useMutation({
    mutationFn: reconApi.autoMatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success('Auto-match completed');
    },
    onError: () => toast.error('Auto-match failed'),
  });

  const complete = useMutation({
    mutationFn: reconApi.completeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success('Session completed');
    },
    onError: () => toast.error('Failed to complete session'),
  });

  const columns: ColumnDef<ReconSession, unknown>[] = useMemo(
    () => [
      { accessorKey: 'sessionId', header: 'Session ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.sessionId}</span> },
      { accessorKey: 'type', header: 'Type', cell: ({ row }) => <TypeBadge type={row.original.type} /> },
      { accessorKey: 'accountCode', header: 'Account/GL Code', cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountCode}</span> },
      { accessorKey: 'counterparty', header: 'Counterparty' },
      { accessorKey: 'currency', header: 'Currency', cell: ({ row }) => <span className="text-sm">{row.original.currency}</span> },
      {
        id: 'period',
        header: 'Period',
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.periodStart)} - {formatDate(row.original.periodEnd)}</span>
        ),
      },
      { accessorKey: 'totalItems', header: 'Items', cell: ({ row }) => <span className="text-sm">{row.original.totalItems.toLocaleString()}</span> },
      { accessorKey: 'matchedItems', header: 'Matched', cell: ({ row }) => <span className="text-sm text-green-600 font-medium">{row.original.matchedItems.toLocaleString()}</span> },
      {
        accessorKey: 'unmatchedItems',
        header: 'Unmatched',
        cell: ({ row }) => (
          <span className={cn('text-sm font-medium', row.original.unmatchedItems > 0 ? 'text-red-600' : 'text-muted-foreground')}>
            {row.original.unmatchedItems.toLocaleString()}
          </span>
        ),
      },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span> },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const s = row.original;
          if (s.status === 'COMPLETED' || s.status === 'CANCELLED') return null;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => autoMatch.mutate(s.sessionId)}
                className="p-1.5 rounded-md hover:bg-muted text-blue-600"
                title="Auto-Match"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => complete.mutate(s.sessionId)}
                className="p-1.5 rounded-md hover:bg-muted text-green-600"
                title="Complete"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [autoMatch, complete],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={sessions} isLoading={isLoading} pageSize={15} emptyMessage="No reconciliation sessions found" />
    </div>
  );
}

// ─── Matching Tab ───────────────────────────────────────────────────────────────

function MatchingTab() {
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: KEYS.sessions,
    queryFn: reconApi.getSessions,
    staleTime: 15_000,
  });

  const activeSessions = sessions.filter((s) => s.status === 'OPEN' || s.status === 'IN_PROGRESS');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedOur, setSelectedOur] = useState<string | null>(null);
  const [selectedTheir, setSelectedTheir] = useState<string | null>(null);
  const [writeOffDialog, setWriteOffDialog] = useState<{ recordId: string } | null>(null);
  const [writeOffReason, setWriteOffReason] = useState('');

  const { data: ourRecords = [], isLoading: ourLoading } = useQuery({
    queryKey: KEYS.ourRecords(selectedSessionId),
    queryFn: () => reconApi.getOurRecords(selectedSessionId),
    enabled: !!selectedSessionId,
    staleTime: 15_000,
  });

  const { data: theirRecords = [], isLoading: theirLoading } = useQuery({
    queryKey: KEYS.theirRecords(selectedSessionId),
    queryFn: () => reconApi.getCounterpartyRecords(selectedSessionId),
    enabled: !!selectedSessionId,
    staleTime: 15_000,
  });

  const manualMatch = useMutation({
    mutationFn: () => {
      if (!selectedOur || !selectedTheir) throw new Error('Select records');
      return reconApi.manualMatch(selectedSessionId, selectedOur, selectedTheir);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ourRecords(selectedSessionId) });
      qc.invalidateQueries({ queryKey: KEYS.theirRecords(selectedSessionId) });
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success('Records matched successfully');
      setSelectedOur(null);
      setSelectedTheir(null);
    },
    onError: () => toast.error('Manual match failed'),
  });

  const writeOff = useMutation({
    mutationFn: ({ recordId, reason }: { recordId: string; reason: string }) =>
      reconApi.writeOff(selectedSessionId, recordId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ourRecords(selectedSessionId) });
      qc.invalidateQueries({ queryKey: KEYS.theirRecords(selectedSessionId) });
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success('Record written off');
      setWriteOffDialog(null);
      setWriteOffReason('');
    },
    onError: () => toast.error('Write-off failed'),
  });

  const recordColumns = (side: 'our' | 'their'): ColumnDef<ReconRecord, unknown>[] => [
    { accessorKey: 'reference', header: 'Reference', cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span> },
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.description}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.amount, row.original.currency)}</span> },
    {
      accessorKey: 'matchStatus',
      header: 'Status',
      cell: ({ row }) => {
        const ms = row.original.matchStatus;
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              ms === 'MATCHED' && 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              ms === 'UNMATCHED' && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              ms === 'WRITTEN_OFF' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            )}
          >
            {ms.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      id: 'select',
      header: '',
      cell: ({ row }) => {
        const r = row.original;
        if (r.matchStatus !== 'UNMATCHED') return null;
        const selected = side === 'our' ? selectedOur === r.id : selectedTheir === r.id;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => side === 'our' ? setSelectedOur(selected ? null : r.id) : setSelectedTheir(selected ? null : r.id)}
              className={cn('p-1 rounded-md text-xs', selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              title="Select for matching"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWriteOffDialog({ recordId: r.id })}
              className="p-1 rounded-md hover:bg-muted text-amber-600"
              title="Write Off"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Session:</label>
        <select
          className="input w-64"
          value={selectedSessionId}
          onChange={(e) => {
            setSelectedSessionId(e.target.value);
            setSelectedOur(null);
            setSelectedTheir(null);
          }}
        >
          <option value="">Select a session...</option>
          {activeSessions.map((s) => (
            <option key={s.sessionId} value={s.sessionId}>
              {s.sessionId} - {s.type} - {s.counterparty}
            </option>
          ))}
        </select>
        {selectedOur && selectedTheir && (
          <button
            onClick={() => manualMatch.mutate()}
            disabled={manualMatch.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Manual Match
          </button>
        )}
      </div>

      {selectedSessionId ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Our Records</h3>
            <DataTable columns={recordColumns('our')} data={ourRecords} isLoading={ourLoading} pageSize={10} emptyMessage="No records" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Counterparty Records</h3>
            <DataTable columns={recordColumns('their')} data={theirRecords} isLoading={theirLoading} pageSize={10} emptyMessage="No records" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Select a session to view matching records
        </div>
      )}

      {/* Write-Off Dialog */}
      {writeOffDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => { setWriteOffDialog(null); setWriteOffReason(''); }} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Write Off Record</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!writeOffReason.trim()) return;
                writeOff.mutate({ recordId: writeOffDialog.recordId, reason: writeOffReason });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason (required)</label>
                <textarea
                  className="w-full mt-1 input min-h-[100px]"
                  placeholder="Provide a reason for write-off..."
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setWriteOffDialog(null); setWriteOffReason(''); }} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={writeOff.isPending || !writeOffReason.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {writeOff.isPending ? 'Processing...' : 'Write Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nostro Accounts Tab ────────────────────────────────────────────────────────

function NostroAccountsTab() {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: KEYS.nostro,
    queryFn: reconApi.getNostroAccounts,
    staleTime: 30_000,
  });

  const columns: ColumnDef<NostroAccount, unknown>[] = useMemo(
    () => [
      { accessorKey: 'accountCode', header: 'Account', cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountCode}</span> },
      { accessorKey: 'bankName', header: 'Bank', cell: ({ row }) => <span className="text-sm">{row.original.bankName}</span> },
      { accessorKey: 'currency', header: 'Currency', cell: ({ row }) => <span className="text-sm font-medium">{row.original.currency}</span> },
      { accessorKey: 'ourBalance', header: 'Our Balance', cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.ourBalance, row.original.currency)}</span> },
      { accessorKey: 'theirBalance', header: 'Their Balance', cell: ({ row }) => <span className="text-sm font-mono">{formatMoney(row.original.theirBalance, row.original.currency)}</span> },
      {
        accessorKey: 'difference',
        header: 'Difference',
        cell: ({ row }) => {
          const diff = row.original.difference;
          return (
            <span className={cn('text-sm font-mono font-medium', diff !== 0 ? 'text-red-600' : 'text-green-600')}>
              {formatMoney(diff, row.original.currency)}
            </span>
          );
        },
      },
      { accessorKey: 'lastReconciled', header: 'Last Reconciled', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.lastReconciled)}</span> },
      { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={accounts} isLoading={isLoading} pageSize={15} emptyMessage="No nostro accounts found" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function ReconciliationPage() {
  const qc = useQueryClient();
  const [showNewSession, setShowNewSession] = useState(false);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: KEYS.sessions,
    queryFn: reconApi.getSessions,
    staleTime: 15_000,
  });

  const autoMatchAll = useMutation({
    mutationFn: reconApi.autoMatchAll,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success(`Auto-match completed: ${data.matched} items matched`);
    },
    onError: () => toast.error('Auto-match all failed'),
  });

  const createSession = useMutation({
    mutationFn: reconApi.createSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      toast.success('Reconciliation session created');
      setShowNewSession(false);
    },
    onError: () => toast.error('Failed to create session'),
  });

  const [newSessionForm, setNewSessionForm] = useState({
    type: 'NOSTRO' as ReconType,
    accountCode: '',
    counterparty: '',
    currency: 'NGN',
    periodStart: '',
    periodEnd: '',
  });

  // Stats
  const activeSessions = sessions.filter((s) => s.status === 'OPEN' || s.status === 'IN_PROGRESS').length;
  const totalItems = sessions.reduce((sum, s) => sum + s.totalItems, 0);
  const matched = sessions.reduce((sum, s) => sum + s.matchedItems, 0);
  const unmatched = sessions.reduce((sum, s) => sum + s.unmatchedItems, 0);
  const writtenOff = totalItems - matched - unmatched;
  const matchRate = totalItems > 0 ? ((matched / totalItems) * 100) : 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Reconciliation"
        subtitle="Nostro, vostro, and interbank reconciliation management"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewSession(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
            <button
              onClick={() => autoMatchAll.mutate()}
              disabled={autoMatchAll.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {autoMatchAll.isPending ? 'Matching...' : 'Auto-Match All'}
            </button>
          </div>
        }
      />

      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Active Sessions" value={activeSessions} format="number" icon={ListChecks} loading={sessionsLoading} />
          <StatCard label="Total Items" value={totalItems} format="number" icon={FileText} loading={sessionsLoading} />
          <StatCard label="Matched" value={matched} format="number" icon={CheckCircle} loading={sessionsLoading} />
          <StatCard label="Unmatched" value={unmatched} format="number" icon={AlertTriangle} loading={sessionsLoading} />
          <StatCard label="Written Off" value={writtenOff} format="number" loading={sessionsLoading} />
          <StatCard label="Match Rate" value={matchRate.toFixed(1) + '%'} loading={sessionsLoading} />
        </div>
      </div>

      <TabsPage
        tabs={[
          { id: 'sessions', label: 'Sessions', icon: ListChecks, content: <SessionsTab /> },
          { id: 'matching', label: 'Matching', icon: ArrowLeftRight, content: <MatchingTab /> },
          { id: 'nostro', label: 'Nostro Accounts', icon: Landmark, content: <NostroAccountsTab /> },
        ]}
        defaultTab="sessions"
      />

      {/* New Session Dialog */}
      {showNewSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowNewSession(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold mb-4">New Reconciliation Session</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSession.mutate(newSessionForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <select
                  className="w-full mt-1 input"
                  value={newSessionForm.type}
                  onChange={(e) => setNewSessionForm((f) => ({ ...f, type: e.target.value as ReconType }))}
                >
                  <option value="NOSTRO">Nostro</option>
                  <option value="VOSTRO">Vostro</option>
                  <option value="INTERBANK">Interbank</option>
                  <option value="GL">GL</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account/GL Code</label>
                  <input
                    className="w-full mt-1 input"
                    placeholder="e.g., NOST-001"
                    value={newSessionForm.accountCode}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, accountCode: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Counterparty</label>
                  <input
                    className="w-full mt-1 input"
                    placeholder="e.g., Citibank"
                    value={newSessionForm.counterparty}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, counterparty: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Currency</label>
                <select
                  className="w-full mt-1 input"
                  value={newSessionForm.currency}
                  onChange={(e) => setNewSessionForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {['NGN', 'USD', 'EUR', 'GBP', 'ZAR', 'GHS', 'KES'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Period Start</label>
                  <input
                    type="date"
                    className="w-full mt-1 input"
                    value={newSessionForm.periodStart}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, periodStart: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Period End</label>
                  <input
                    type="date"
                    className="w-full mt-1 input"
                    value={newSessionForm.periodEnd}
                    onChange={(e) => setNewSessionForm((f) => ({ ...f, periodEnd: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewSession(false)} className="px-3 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSession.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createSession.isPending ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
