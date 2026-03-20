import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateDiffViewerProps {
  leftLabel: string;
  leftContent: string;
  rightLabel: string;
  rightContent: string;
  onClose: () => void;
}

export function TemplateDiffViewer({ leftLabel, leftContent, rightLabel, rightContent, onClose }: TemplateDiffViewerProps) {
  const leftLines = leftContent.split('\n');
  const rightLines = rightContent.split('\n');
  const maxLen = Math.max(leftLines.length, rightLines.length);

  // Simple line-level diff: compare each line
  const diffLines: { left: string; right: string; status: 'same' | 'changed' | 'added' | 'removed' }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i] ?? '';
    const r = rightLines[i] ?? '';
    if (l === r) {
      diffLines.push({ left: l, right: r, status: 'same' });
    } else if (!l && r) {
      diffLines.push({ left: '', right: r, status: 'added' });
    } else if (l && !r) {
      diffLines.push({ left: l, right: '', status: 'removed' });
    } else {
      diffLines.push({ left: l, right: r, status: 'changed' });
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 bg-card rounded-xl border shadow-2xl z-[60] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-semibold text-sm">Template Diff</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-2 border-b flex-shrink-0">
          <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-xs font-semibold text-red-700 dark:text-red-400 border-r">
            {leftLabel}
          </div>
          <div className="px-4 py-2.5 bg-green-50 dark:bg-green-900/10 text-xs font-semibold text-green-700 dark:text-green-400">
            {rightLabel}
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto font-mono text-xs">
          {diffLines.map((line, i) => (
            <div key={i} className="grid grid-cols-2">
              <div
                className={cn(
                  'px-4 py-1 border-r border-b whitespace-pre-wrap break-all',
                  line.status === 'removed' && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                  line.status === 'changed' && 'bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300',
                  line.status === 'same' && 'text-muted-foreground',
                  line.status === 'added' && 'text-muted-foreground/30',
                )}
              >
                <span className="inline-block w-6 text-right mr-2 text-muted-foreground/50 select-none">{i + 1}</span>
                {line.left}
              </div>
              <div
                className={cn(
                  'px-4 py-1 border-b whitespace-pre-wrap break-all',
                  line.status === 'added' && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                  line.status === 'changed' && 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300',
                  line.status === 'same' && 'text-muted-foreground',
                  line.status === 'removed' && 'text-muted-foreground/30',
                )}
              >
                <span className="inline-block w-6 text-right mr-2 text-muted-foreground/50 select-none">{i + 1}</span>
                {line.right}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200" />
            Removed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200" />
            Added
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-200" />
            Changed
          </div>
        </div>
      </div>
    </>
  );
}
