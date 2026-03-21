import { AlertTriangle, Download, Printer, X } from 'lucide-react';

interface BulkActionBarProps {
  count: number;
  onExportSelected: () => void;
  onPrintSelected: () => void;
  onDisputeSelected: () => void;
  onClearSelection: () => void;
  canDispute?: boolean;
}

export function BulkActionBar({
  count,
  onExportSelected,
  onPrintSelected,
  onDisputeSelected,
  onClearSelection,
  canDispute = true,
}: BulkActionBarProps) {
  if (count < 1) return null;

  return (
    <div className="no-print fixed bottom-6 left-1/2 z-40 w-[min(92vw,760px)] -translate-x-1/2 rounded-2xl border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 font-semibold text-primary">
            {count}
          </span>
          <span>{count} selected</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportSelected}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export Selected
          </button>
          <button
            onClick={onPrintSelected}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Print Selected
          </button>
          {canDispute && (
            <button
              onClick={onDisputeSelected}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
            >
              <AlertTriangle className="h-4 w-4" />
              Dispute Selected
            </button>
          )}
          <button
            onClick={onClearSelection}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}
