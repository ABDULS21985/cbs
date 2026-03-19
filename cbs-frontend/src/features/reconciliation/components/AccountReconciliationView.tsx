import { useState } from 'react';
import { Loader2, GitMerge, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReconciliationSession } from '../api/reconciliationApi';
import { ReconciliationSplitView } from './ReconciliationSplitView';
import { MatchedItemsTable } from './MatchedItemsTable';
import { ManualMatchDialog } from './ManualMatchDialog';
import { createManualMatch } from '../api/reconciliationApi';

type ViewTab = 'split' | 'matched';

interface AccountReconciliationViewProps {
  session: ReconciliationSession | null;
  loading: boolean;
}

const TABS: Array<{ id: ViewTab; label: string; icon: typeof GitMerge }> = [
  { id: 'split', label: 'Split View', icon: GitMerge },
  { id: 'matched', label: 'Matched Items', icon: CheckCircle2 },
];

export function AccountReconciliationView({ session, loading }: AccountReconciliationViewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('split');
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [pendingOurId, setPendingOurId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading reconciliation session…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border bg-card border-dashed flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No reconciliation session loaded</p>
          <p className="text-xs text-muted-foreground/70">Select a nostro account and date, then load the session.</p>
        </div>
      </div>
    );
  }

  const handleManualMatchFromSplit = (ourId: string, bankId: string) => {
    // Quick match directly from split view (both IDs already selected)
    createManualMatch(session.id, [ourId], [bankId]).then(() => {
      console.log('[AccountReconciliationView] manual match created', ourId, bankId);
    });
  };

  const handleManualMatchConfirm = async (ourId: string, bankIds: string[]) => {
    await createManualMatch(session.id, [ourId], bankIds);
    setMatchDialogOpen(false);
    setPendingOurId(null);
  };

  const selectedOurEntry = pendingOurId
    ? session.ourEntries.find((e) => e.id === pendingOurId) ?? null
    : null;

  const unmatchedBankEntries = session.bankEntries.filter(
    (e) => e.status === 'UNMATCHED' || e.status === 'PARTIAL',
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === id
                ? 'bg-background shadow-sm border text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Session: <span className="font-mono font-medium text-foreground">{session.id}</span>
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full font-medium',
              session.status === 'COMPLETED'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : session.status === 'IN_PROGRESS'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {session.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'split' && (
          <ReconciliationSplitView
            ourEntries={session.ourEntries}
            bankEntries={session.bankEntries}
            onManualMatch={handleManualMatchFromSplit}
          />
        )}

        {activeTab === 'matched' && (
          <MatchedItemsTable entries={session.ourEntries} />
        )}
      </div>

      {/* Manual Match Dialog */}
      <ManualMatchDialog
        open={matchDialogOpen}
        ourEntry={selectedOurEntry}
        bankEntries={unmatchedBankEntries}
        onConfirm={handleManualMatchConfirm}
        onClose={() => {
          setMatchDialogOpen(false);
          setPendingOurId(null);
        }}
      />

    </div>
  );
}
