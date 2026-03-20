import { useState, useCallback, type DragEvent } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Link2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry, ReconciliationStatus } from '../api/reconciliationApi';
import { MatchConfirmation } from './MatchConfirmation';
import { MatchSuggestions } from './MatchSuggestions';
import { AmountToleranceSlider } from './AmountToleranceSlider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ReconciliationStatus }) {
  if (status === 'MATCHED') return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />;
  if (status === 'PARTIAL') return <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />;
}

function rowBg(status: ReconciliationStatus, selected: boolean, dropTarget: boolean): string {
  if (dropTarget) return 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-inset ring-blue-400 scale-[1.01]';
  if (selected) return 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-500';
  if (status === 'MATCHED') return 'bg-green-50/60 dark:bg-green-900/10';
  if (status === 'PARTIAL') return 'bg-amber-50/60 dark:bg-amber-900/10';
  return 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20';
}

// ─── Draggable Entry Row ──────────────────────────────────────────────────────

interface DraggableRowProps {
  entry: ReconciliationEntry;
  side: 'our' | 'bank';
  selected: boolean;
  isDropTarget: boolean;
  onSelect: (id: string) => void;
  onDragStart: (e: DragEvent<HTMLTableRowElement>, entry: ReconciliationEntry, side: 'our' | 'bank') => void;
  onDragOver: (e: DragEvent<HTMLTableRowElement>) => void;
  onDragLeave: (e: DragEvent<HTMLTableRowElement>) => void;
  onDrop: (e: DragEvent<HTMLTableRowElement>, targetEntry: ReconciliationEntry, targetSide: 'our' | 'bank') => void;
}

function DraggableRow({
  entry, side, selected, isDropTarget, onSelect,
  onDragStart, onDragOver, onDragLeave, onDrop,
}: DraggableRowProps) {
  const isDraggable = entry.status === 'UNMATCHED' || entry.status === 'PARTIAL';

  return (
    <tr
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, entry, side)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, entry, side)}
      onClick={() => isDraggable && onSelect(entry.id)}
      className={cn(
        'border-b last:border-0 transition-all duration-150',
        rowBg(entry.status, selected, isDropTarget),
        isDraggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <td className="px-1.5 py-2.5 text-center">
        {isDraggable && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 inline-block" />}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-muted-foreground text-xs">
        {formatDate(entry.date)}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
        {entry.reference}
      </td>
      <td className="px-3 py-2.5 max-w-[160px] text-xs">
        <span className="block truncate" title={entry.description}>{entry.description}</span>
      </td>
      <td className={cn(
        'px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap font-medium text-xs',
        entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
      )}>
        {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
      </td>
      <td className="px-3 py-2.5 text-center">
        <StatusIcon status={entry.status} />
      </td>
    </tr>
  );
}

// ─── Pane ─────────────────────────────────────────────────────────────────────

interface PaneProps {
  title: string;
  side: 'our' | 'bank';
  entries: ReconciliationEntry[];
  selectedId: string | null;
  dropTargetId: string | null;
  onSelect: (id: string) => void;
  onDragStart: (e: DragEvent<HTMLTableRowElement>, entry: ReconciliationEntry, side: 'our' | 'bank') => void;
  onDragOver: (e: DragEvent<HTMLTableRowElement>) => void;
  onDragLeave: (e: DragEvent<HTMLTableRowElement>) => void;
  onDrop: (e: DragEvent<HTMLTableRowElement>, target: ReconciliationEntry, targetSide: 'our' | 'bank') => void;
}

function Pane({ title, side, entries, selectedId, dropTargetId, onSelect, onDragStart, onDragOver, onDragLeave, onDrop }: PaneProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col border rounded-xl overflow-hidden bg-card">
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between',
        side === 'our' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-purple-50/50 dark:bg-purple-900/10',
      )}>
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{entries.filter(e => e.status === 'UNMATCHED').length} unmatched</span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-8" />
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Reference</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Amount</th>
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground w-10">St.</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <DraggableRow
                key={entry.id}
                entry={entry}
                side={side}
                selected={selectedId === entry.id}
                isDropTarget={dropTargetId === entry.id}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
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

interface DragMatchPanelProps {
  sessionId: string;
  ourEntries: ReconciliationEntry[];
  bankEntries: ReconciliationEntry[];
  onMatchConfirmed: () => void;
}

export function DragMatchPanel({ sessionId, ourEntries, bankEntries, onMatchConfirmed }: DragMatchPanelProps) {
  const [selectedOurId, setSelectedOurId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(0);

  // Match confirmation state
  const [confirmMatch, setConfirmMatch] = useState<{
    ourEntry: ReconciliationEntry;
    bankEntry: ReconciliationEntry;
  } | null>(null);

  const dragDataRef = { current: null as { entry: ReconciliationEntry; side: 'our' | 'bank' } | null };

  const handleDragStart = useCallback((e: DragEvent<HTMLTableRowElement>, entry: ReconciliationEntry, side: 'our' | 'bank') => {
    e.dataTransfer.effectAllowed = 'link';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: entry.id, side }));
    dragDataRef.current = { entry, side };
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    const row = e.currentTarget;
    const entryId = row.querySelector('[data-entry-id]')?.getAttribute('data-entry-id');
    if (entryId) setDropTargetId(entryId);
  }, []);

  const handleDragLeave = useCallback((_e: DragEvent<HTMLTableRowElement>) => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLTableRowElement>, targetEntry: ReconciliationEntry, targetSide: 'our' | 'bank') => {
    e.preventDefault();
    setDropTargetId(null);

    try {
      const raw = e.dataTransfer.getData('text/plain');
      const { id: sourceId, side: sourceSide } = JSON.parse(raw) as { id: string; side: 'our' | 'bank' };

      // Must drop on opposite side
      if (sourceSide === targetSide) return;

      const sourceEntry = sourceSide === 'our'
        ? ourEntries.find(en => en.id === sourceId)
        : bankEntries.find(en => en.id === sourceId);

      if (!sourceEntry) return;

      const ourEntry = sourceSide === 'our' ? sourceEntry : targetEntry;
      const bankEntry = sourceSide === 'bank' ? sourceEntry : targetEntry;

      setConfirmMatch({ ourEntry, bankEntry });
    } catch {
      // invalid drag data
    }
  }, [ourEntries, bankEntries]);

  const handleSelectOur = (id: string) => {
    setSelectedOurId(prev => prev === id ? null : id);
  };

  const handleSelectBank = (id: string) => {
    setSelectedBankId(prev => prev === id ? null : id);
  };

  const selectedOurEntry = ourEntries.find(e => e.id === selectedOurId) ?? null;
  const selectedBankEntry = bankEntries.find(e => e.id === selectedBankId) ?? null;

  const handleSuggestionAccept = (ourEntry: ReconciliationEntry, bankEntry: ReconciliationEntry) => {
    setConfirmMatch({ ourEntry, bankEntry });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Drag an entry from one side and drop it on the matching entry on the other side to create a match.
        </p>
        <AmountToleranceSlider value={tolerance} onChange={setTolerance} />
      </div>

      {/* Split Panes */}
      <div className="flex gap-3 min-h-[400px]">
        <div className="flex-1 min-w-0 relative">
          <Pane
            title="Our Books"
            side="our"
            entries={ourEntries}
            selectedId={selectedOurId}
            dropTargetId={dropTargetId}
            onSelect={handleSelectOur}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
          {selectedOurEntry && (
            <MatchSuggestions
              selectedEntry={selectedOurEntry}
              candidateEntries={bankEntries.filter(e => e.status === 'UNMATCHED' || e.status === 'PARTIAL')}
              tolerance={tolerance}
              onAccept={(candidate) => handleSuggestionAccept(selectedOurEntry, candidate)}
            />
          )}
        </div>
        <div className="flex items-center">
          <Link2 className="w-5 h-5 text-muted-foreground/40" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <Pane
            title="Bank Statement"
            side="bank"
            entries={bankEntries}
            selectedId={selectedBankId}
            dropTargetId={dropTargetId}
            onSelect={handleSelectBank}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
          {selectedBankEntry && (
            <MatchSuggestions
              selectedEntry={selectedBankEntry}
              candidateEntries={ourEntries.filter(e => e.status === 'UNMATCHED' || e.status === 'PARTIAL')}
              tolerance={tolerance}
              onAccept={(candidate) => handleSuggestionAccept(candidate, selectedBankEntry)}
            />
          )}
        </div>
      </div>

      {/* Match Confirmation Modal */}
      {confirmMatch && (
        <MatchConfirmation
          sessionId={sessionId}
          ourEntry={confirmMatch.ourEntry}
          bankEntry={confirmMatch.bankEntry}
          onConfirmed={() => {
            setConfirmMatch(null);
            setSelectedOurId(null);
            setSelectedBankId(null);
            onMatchConfirmed();
          }}
          onCancel={() => setConfirmMatch(null)}
        />
      )}
    </div>
  );
}
