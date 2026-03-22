import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Zap, Loader2, ChevronDown, Search, Building2, Landmark, Banknote, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  getNostroAccounts,
  getReconciliationSession,
  uploadStatement,
  runAutoMatch,
  writeOffEntry,
  createManualMatch,
  type NostroAccount,
  type ReconciliationSession,
} from '../api/reconciliationApi';
import { AccountReconciliationView } from '../components/AccountReconciliationView';
import { ReconciliationSummary } from '../components/ReconciliationSummary';
import { UnmatchedItemsPanel } from '../components/UnmatchedItemsPanel';
import { StatementUploader } from '../components/StatementUploader';
import { SubLedgerReconTab } from '../components/SubLedgerReconTab';
import type { UnmatchedAction } from '../components/UnmatchedItemsPanel';
import type { ReconciliationEntry } from '../api/reconciliationApi';

// ─── Types ─────────────────────────────────────────────────────────────────────

type MainTab = 'nostro' | 'subledger' | 'branch';

const MAIN_TABS: Array<{ id: MainTab; label: string; icon: typeof Building2 }> = [
  { id: 'nostro', label: 'Nostro / Vostro', icon: Landmark },
  { id: 'subledger', label: 'Sub-Ledger', icon: Building2 },
  { id: 'branch', label: 'Branch Cash', icon: Banknote },
];

// ─── Searchable Account Select ─────────────────────────────────────────────────

interface SearchableAccountSelectProps {
  accounts: NostroAccount[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

function SearchableAccountSelect({ accounts, selectedId, onSelect, loading }: SearchableAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.number.includes(query) ||
      a.correspondentBank.toLowerCase().includes(query.toLowerCase()),
  );

  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <div className="relative w-72">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="w-full flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:border-primary/50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading accounts…
          </span>
        ) : selected ? (
          <span className="flex flex-col items-start text-left min-w-0">
            <span className="font-medium truncate max-w-full">{selected.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{selected.number}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select nostro account…</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 w-full rounded-xl border bg-popover shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">No accounts found</p>
              ) : (
                filtered.map((acct) => (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => { onSelect(acct.id); setOpen(false); setQuery(''); }}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 text-left text-xs hover:bg-muted transition-colors',
                      acct.id === selectedId && 'bg-primary/5',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{acct.name}</p>
                      <p className="text-muted-foreground font-mono">{acct.number} · {acct.correspondentBank}</p>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-mono">{acct.currency}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Placeholder Tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed py-20 text-center text-muted-foreground">
      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs mt-1">This reconciliation type will be implemented in a subsequent release.</p>
    </div>
  );
}

// ─── Upload Sheet ──────────────────────────────────────────────────────────────

interface UploadSheetProps {
  open: boolean;
  accountId: string;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

function UploadSheet({ open, accountId, onClose, onUpload }: UploadSheetProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Upload Bank Statement</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <span className="sr-only">Close</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <StatementUploader accountId={accountId} onUpload={onUpload} />
        </div>
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ReconciliationWorkbenchPage() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);

  const [mainTab, setMainTab] = useState<MainTab>('nostro');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [session, setSession] = useState<ReconciliationSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Accounts query
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isError: accountsError,
  } = useQuery({
    queryKey: ['nostroAccounts'],
    queryFn: getNostroAccounts,
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: (sessionId: string) => runAutoMatch(sessionId),
    onSuccess: (updated) => {
      setSession(updated);
      queryClient.invalidateQueries({ queryKey: ['reconciliationSession'] });
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ accountId, file }: { accountId: string; file: File }) =>
      uploadStatement(accountId, file),
    onSuccess: () => {
      setUploadSheetOpen(false);
      if (selectedAccountId && selectedDate) handleLoadSession();
    },
  });

  const handleLoadSession = async () => {
    if (!selectedAccountId || !selectedDate) return;
    setSessionLoading(true);
    setSessionError(null);
    try {
      const data = await getReconciliationSession(selectedAccountId, selectedDate);
      setSession(data);
    } catch {
      setSession(null);
      setSessionError('Reconciliation session could not be loaded from the backend.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync({ accountId: selectedAccountId, file });
  };

  const handleAutoMatch = () => {
    if (session) autoMatchMutation.mutate(session.id);
  };

  const handleUnmatchedAction = async (action: UnmatchedAction, entry: ReconciliationEntry) => {
    if (!session) return;
    try {
      if (action === 'WRITE_OFF') {
        await writeOffEntry(session.id, entry.id, 'Write-off from workbench');
        addToast({ type: 'success', title: 'Entry Written Off', message: `Entry ${entry.reference} written off.` });
        handleLoadSession();
      } else if (action === 'MANUAL_MATCH') {
        await createManualMatch(session.id, [entry.id], []);
        addToast({ type: 'info', title: 'Manual Match', message: 'Manual match initiated. Select counterpart entry.' });
      } else if (action === 'JOURNAL_ENTRY') {
        addToast({ type: 'info', title: 'Journal Entry', message: `Journal entry for ${entry.reference} will be created.` });
      } else if (action === 'ESCALATE') {
        addToast({ type: 'info', title: 'Escalated', message: `Entry ${entry.reference} escalated for review.` });
      }
    } catch {
      addToast({ type: 'error', title: 'Action Failed', message: `Failed to ${action} entry ${entry.reference}.` });
    }
  };

  const ourUnmatched = session?.ourEntries.filter((e) => e.status === 'UNMATCHED') ?? [];
  const bankUnmatched = session?.bankEntries.filter((e) => e.status === 'UNMATCHED') ?? [];

  return (
    <>
      <PageHeader
        title="Reconciliation"
        subtitle="Account reconciliation workbench — match, resolve, and certify breaks."
      />

      <div className="page-container space-y-5">
        {/* Main Tab Bar */}
        <div className="flex items-center gap-1 border-b pb-0">
          {MAIN_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                mainTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {mainTab === 'subledger' && <SubLedgerReconTab />}
        {mainTab === 'branch' && <PlaceholderTab label="Branch Cash Reconciliation" />}

        {mainTab === 'nostro' && (
          <>
            {accountsError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Nostro accounts could not be loaded from the backend.
              </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-3">
              <SearchableAccountSelect
                accounts={accounts}
                selectedId={selectedAccountId}
                onSelect={(id) => { setSelectedAccountId(id); setSession(null); }}
                loading={accountsLoading}
              />

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <button
                onClick={handleLoadSession}
                disabled={!selectedAccountId || !selectedDate || sessionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sessionLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                ) : (
                  'Load Session'
                )}
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setUploadSheetOpen(true)}
                  disabled={!selectedAccountId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Upload Statement
                </button>

                <button
                  onClick={handleAutoMatch}
                  disabled={!session || autoMatchMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {autoMatchMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Matching…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Run Auto-Match</>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-match feedback */}
            {autoMatchMutation.isSuccess && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 px-4 py-2.5 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Auto-match completed. Review results in the split view.
              </div>
            )}

            {sessionError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {sessionError}
              </div>
            )}

            {/* Main Content */}
            <AccountReconciliationView session={session} loading={sessionLoading} />

            {/* Summary + Unmatched — only when session is loaded */}
            {session && (
              <>
                <ReconciliationSummary session={session} />
                <UnmatchedItemsPanel
                  ourUnmatched={ourUnmatched}
                  bankUnmatched={bankUnmatched}
                  onAction={handleUnmatchedAction}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Upload Sheet */}
      <UploadSheet
        open={uploadSheetOpen}
        accountId={selectedAccountId}
        onClose={() => setUploadSheetOpen(false)}
        onUpload={handleUpload}
      />
    </>
  );
}
