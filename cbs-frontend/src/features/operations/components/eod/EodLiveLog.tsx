import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Download, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EodLogEntry } from '../../api/eodApi';

interface EodLiveLogProps {
  logs: EodLogEntry[];
  isLive: boolean;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } catch {
    return '--:--:--';
  }
}

function levelColor(level: EodLogEntry['level']): string {
  switch (level) {
    case 'ERROR':
      return 'text-red-400';
    case 'WARN':
      return 'text-amber-400';
    default:
      return 'text-gray-400';
  }
}

function levelBadge(level: EodLogEntry['level']): string {
  switch (level) {
    case 'ERROR':
      return 'text-red-300 bg-red-900/30';
    case 'WARN':
      return 'text-amber-300 bg-amber-900/30';
    default:
      return 'text-gray-400 bg-gray-800/30';
  }
}

export function EodLiveLog({ logs, isLive }: EodLiveLogProps) {
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (!paused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [paused]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const filtered = search.trim()
    ? logs.filter((e) => e.message.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const handleExport = () => {
    const content = logs
      .map((e) => `[${formatTimestamp(e.timestamp)}] [${e.level}] ${e.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eod-log-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border bg-gray-950 dark:bg-gray-950 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Live Log</span>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              LIVE
            </span>
          )}
          <span className="text-xs text-gray-500">{logs.length} entries</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs..."
              className="pl-6 pr-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 w-40"
            />
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white rounded bg-gray-800 border border-gray-700 transition-colors"
            title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {paused
              ? <><PlayCircle className="w-3 h-3" /> Resume</>
              : <><PauseCircle className="w-3 h-3" /> Pause</>
            }
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white rounded bg-gray-800 border border-gray-700 transition-colors"
            title="Export log as .txt"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-auto font-mono text-xs leading-relaxed p-3 space-y-0.5"
        style={{ maxHeight: 320 }}
      >
        {filtered.length === 0 && (
          <p className="text-gray-600 text-center py-8">
            {search ? 'No log entries match your filter.' : 'Waiting for EOD run to start...'}
          </p>
        )}
        {filtered.map((entry, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-2',
              entry.message.startsWith('  ') && 'pl-4',
            )}
          >
            <span className="flex-shrink-0 text-gray-600">[{formatTimestamp(entry.timestamp)}]</span>
            <span className={cn('flex-shrink-0 px-1 rounded text-[10px] font-bold uppercase', levelBadge(entry.level))}>
              {entry.level}
            </span>
            <span className={cn('break-all', levelColor(entry.level))}>
              {entry.message}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
