import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry, ReconciliationStatus } from '../api/reconciliationApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ReconciliationStatus }) {
  if (status === 'MATCHED') return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />;
  if (status === 'PARTIAL') return <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />;
}

function rowBg(status: ReconciliationStatus, selected: boolean): string {
  if (selected) return 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500';
  if (status === 'MATCHED') return 'bg-green-50/60 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20';
  if (status === 'PARTIAL') return 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20';
  return 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer';
}

// ─── Entry Table ──────────────────────────────────────────────────────────────

interface EntryTableProps {
  title: string;
  entries: ReconciliationEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  side: 'our' | 'bank';
}

function EntryTable({ title, entries, selectedId, onSelect, side }: EntryTableProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col border rounded-xl overflow-hidden bg-card">
      {/* Panel Header */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between',
        side === 'our' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-purple-50/50 dark:bg-purple-900/10',
      )}>
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Matched</span>
          <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Partial</span>
          <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" /> Unmatched</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Reference</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Amount</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-10">St.</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const selected = selectedId === entry.id;
              const clickable = entry.status === 'UNMATCHED' || entry.status === 'PARTIAL';
              return (
                <tr
                  key={entry.id}
                  onClick={() => clickable && onSelect(entry.id)}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    rowBg(entry.status, selected),
                    clickable && 'cursor-pointer',
                  )}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-muted-foreground">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
                    {entry.reference}
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <span className="block truncate" title={entry.description}>{entry.description}</span>
                    {entry.matchedRef && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <Link2 className="w-2.5 h-2.5" />
                        {entry.matchedRef}
                      </span>
                    )}
                  </td>
                  <td className={cn(
                    'px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap font-medium',
                    entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
                  )}>
                    {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusIcon status={entry.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No entries to display</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ReconciliationSplitViewProps {
  ourEntries: ReconciliationEntry[];
  bankEntries: ReconciliationEntry[];
  onManualMatch: (ourId: string, bankId: string) => void;
}

export function ReconciliationSplitView({ ourEntries, bankEntries, onManualMatch }: ReconciliationSplitViewProps) {
  const [selectedOurId, setSelectedOurId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const handleSelectOur = (id: string) => {
    setSelectedOurId((prev) => (prev === id ? null : id));
  };

  const handleSelectBank = (id: string) => {
    setSelectedBankId((prev) => (prev === id ? null : id));
  };

  const canMatch = selectedOurId !== null && selectedBankId !== null;

  const handleMatch = () => {
    if (!selectedOurId || !selectedBankId) return;
    onManualMatch(selectedOurId, selectedBankId);
    setSelectedOurId(null);
    setSelectedBankId(null);
  };

  const selectedOur = ourEntries.find((e) => e.id === selectedOurId);
  const selectedBank = bankEntries.find((e) => e.id === selectedBankId);

  return (
    <div className="space-y-3">
      {/* Match Prompt Banner */}
      {(selectedOurId || selectedBankId) && (
        <div className={cn(
          'rounded-lg px-4 py-3 flex items-center justify-between gap-4 border text-sm transition-all',
          canMatch
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-muted/50 border-border',
        )}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-muted-foreground">Selected:</span>
            {selectedOur && (
              <span className="font-mono text-xs bg-background rounded px-2 py-0.5 border truncate">
                {selectedOur.reference} &nbsp;({formatMoney(selectedOur.amount)})
              </span>
            )}
            {!selectedOur && <span className="text-muted-foreground italic text-xs">none from Our Books</span>}
            <span className="text-muted-foreground">↔</span>
            {selectedBank && (
              <span className="font-mono text-xs bg-background rounded px-2 py-0.5 border truncate">
                {selectedBank.reference} &nbsp;({formatMoney(selectedBank.amount)})
              </span>
            )}
            {!selectedBank && <span className="text-muted-foreground italic text-xs">none from Bank Statement</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canMatch && selectedOur && selectedBank && (
              <span className={cn(
                'text-xs font-medium',
                selectedOur.amount === selectedBank.amount ? 'text-green-600' : 'text-amber-600',
              )}>
                {selectedOur.amount === selectedBank.amount
                  ? 'Amounts match'
                  : `Diff: ${formatMoney(Math.abs(selectedOur.amount - selectedBank.amount))}`}
              </span>
            )}
            <button
              onClick={() => { setSelectedOurId(null); setSelectedBankId(null); }}
              className="px-3 py-1.5 rounded-md text-xs border hover:bg-muted transition-colors"
            >
              Clear
            </button>
            {canMatch && (
              <button
                onClick={handleMatch}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                Match These
              </button>
            )}
          </div>
        </div>
      )}

      {!selectedOurId && !selectedBankId && (
        <p className="text-xs text-muted-foreground px-0.5">
          Click any <span className="text-red-500 font-medium">unmatched</span> or <span className="text-amber-500 font-medium">partial</span> row on each side to select and manually match them.
        </p>
      )}

      {/* Split Panels */}
      <div className="flex gap-3 min-h-[400px]">
        <EntryTable
          title="Our Books"
          entries={ourEntries}
          selectedId={selectedOurId}
          onSelect={handleSelectOur}
          side="our"
        />
        <EntryTable
          title="Bank Statement"
          entries={bankEntries}
          selectedId={selectedBankId}
          onSelect={handleSelectBank}
          side="bank"
        />
      </div>
    </div>
  );
}
