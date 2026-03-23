import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHORTCUTS = [
  { keys: ['\u2191', '\u2193'], description: 'Navigate entries up / down' },
  { keys: ['Tab'], description: 'Switch between Our Books and Bank Statement' },
  { keys: ['Space'], description: 'Select / deselect current entry' },
  { keys: ['M'], description: 'Match selected entries' },
  { keys: ['W'], description: 'Write off selected entry' },
  { keys: ['R'], description: 'Run auto-match' },
  { keys: ['Esc'], description: 'Clear selection / close dialog' },
  { keys: ['?'], description: 'Toggle this help panel' },
] as const;

export function KeyboardShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === '?') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-3.5 h-3.5" />
        Shortcuts
      </button>

      {/* Floating panel */}
      {open && (
        <div className={cn(
          'fixed bottom-4 right-4 z-50 w-72 surface-card shadow-2xl overflow-hidden',
          'animate-in slide-in-from-bottom-2 fade-in duration-200',
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold">Keyboard Shortcuts</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-1.5">
            {SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded border bg-muted font-mono text-[10px] font-medium"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
