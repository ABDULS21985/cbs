import { useState } from 'react';
import { X, Link2, BookOpen, FileText, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry } from '../api/reconciliationApi';
import { BreakResolutionForm, type BreakResolutionData } from './BreakResolutionForm';

export type UnmatchedAction = 'MANUAL_MATCH' | 'WRITE_OFF' | 'JOURNAL_ENTRY' | 'ESCALATE';

interface UnmatchedItemsPanelProps {
  ourUnmatched: ReconciliationEntry[];
  bankUnmatched: ReconciliationEntry[];
  onAction: (action: UnmatchedAction, entry: ReconciliationEntry) => void;
}

interface ActionButtonProps {
  icon: typeof Link2;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }: ActionButtonProps) {
  const variantClass = {
    default: 'hover:bg-muted border-border text-foreground',
    destructive: 'hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    warning: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    info: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  }[variant];

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        variantClass,
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Resolution Sheet ──────────────────────────────────────────────────────────

interface ResolutionSheetProps {
  entry: ReconciliationEntry | null;
  action: UnmatchedAction | null;
  onSubmit: (data: BreakResolutionData) => void;
  onClose: () => void;
}

function ResolutionSheet({ entry, action, onSubmit, onClose }: ResolutionSheetProps) {
  if (!entry || !action || action === 'MANUAL_MATCH') return null;

  const titles: Record<string, string> = {
    WRITE_OFF: 'Write Off Entry',
    JOURNAL_ENTRY: 'Create Journal Entry',
    ESCALATE: 'Escalate for Investigation',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-base font-semibold">{titles[action]}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <BreakResolutionForm
            entry={entry}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </>
  );
}

// ─── Entry Row ─────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: ReconciliationEntry;
  onAction: (action: UnmatchedAction) => void;
}

function EntryRow({ entry, onAction }: EntryRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-4 text-xs">
        <div>
          <p className="text-muted-foreground">Date</p>
          <p className="font-mono mt-0.5">{formatDate(entry.date)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Reference</p>
          <p className="font-mono break-all mt-0.5">{entry.reference}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Amount</p>
          <p className={cn(
            'font-mono font-semibold mt-0.5',
            entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
          )}>
            {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="mt-0.5">{entry.type}</p>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <p className="text-muted-foreground">Description</p>
          <p className="mt-0.5 truncate" title={entry.description}>{entry.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
        <ActionButton
          icon={Link2}
          label="Manual Match"
          variant="info"
          onClick={() => onAction('MANUAL_MATCH')}
        />
        <ActionButton
          icon={BookOpen}
          label="Write Off"
          variant="destructive"
          onClick={() => onAction('WRITE_OFF')}
        />
        <ActionButton
          icon={FileText}
          label="Journal Entry"
          onClick={() => onAction('JOURNAL_ENTRY')}
        />
        <ActionButton
          icon={ArrowUpCircle}
          label="Escalate"
          variant="warning"
          onClick={() => onAction('ESCALATE')}
        />
      </div>
    </div>
  );
}

// ─── Panel Section ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  entries: ReconciliationEntry[];
  side: 'our' | 'bank';
  onEntryAction: (action: UnmatchedAction, entry: ReconciliationEntry) => void;
}

function Section({ title, entries, side, onEntryAction }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'w-2 h-2 rounded-full',
          side === 'our' ? 'bg-blue-500' : 'bg-purple-500',
        )} />
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">({entries.length})</span>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          No unmatched entries
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onAction={(action) => onEntryAction(action, entry)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnmatchedItemsPanel({ ourUnmatched, bankUnmatched, onAction }: UnmatchedItemsPanelProps) {
  const [activeEntry, setActiveEntry] = useState<ReconciliationEntry | null>(null);
  const [activeAction, setActiveAction] = useState<UnmatchedAction | null>(null);

  const handleEntryAction = (action: UnmatchedAction, entry: ReconciliationEntry) => {
    onAction(action, entry);
    if (action !== 'MANUAL_MATCH') {
      setActiveEntry(entry);
      setActiveAction(action);
    }
  };

  const handleResolutionSubmit = (data: BreakResolutionData) => {
    console.log('[UnmatchedItemsPanel] resolution submitted', data);
    setActiveEntry(null);
    setActiveAction(null);
  };

  const total = ourUnmatched.length + bankUnmatched.length;

  return (
    <>
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Unmatched Items</h3>
          {total > 0 && (
            <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {total}
            </span>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Section
            title="Unmatched in Our Books"
            entries={ourUnmatched}
            side="our"
            onEntryAction={handleEntryAction}
          />
          <Section
            title="Unmatched in Bank Statement"
            entries={bankUnmatched}
            side="bank"
            onEntryAction={handleEntryAction}
          />
        </div>
      </div>

      <ResolutionSheet
        entry={activeEntry}
        action={activeAction}
        onSubmit={handleResolutionSubmit}
        onClose={() => { setActiveEntry(null); setActiveAction(null); }}
      />
    </>
  );
}
