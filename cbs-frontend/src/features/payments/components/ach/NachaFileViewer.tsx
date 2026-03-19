import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NachaFileViewerProps {
  content: string | null;
  open: boolean;
  onClose: () => void;
}

const RECORD_TYPES: { prefix: string; label: string; bg: string; dot: string }[] = [
  { prefix: '1', label: 'File Header', bg: 'bg-blue-50 dark:bg-blue-900/20', dot: 'bg-blue-400' },
  { prefix: '5', label: 'Batch Header', bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-400' },
  { prefix: '6', label: 'Entry Detail', bg: 'bg-white dark:bg-transparent', dot: 'bg-gray-300' },
  { prefix: '7', label: 'Addenda', bg: 'bg-yellow-50 dark:bg-yellow-900/20', dot: 'bg-yellow-400' },
  { prefix: '8', label: 'Batch Control', bg: 'bg-green-50 dark:bg-green-900/20', dot: 'bg-green-400' },
  { prefix: '9', label: 'File Control', bg: 'bg-blue-50 dark:bg-blue-900/20', dot: 'bg-blue-400' },
];

function getLineStyle(line: string): string {
  const first = line.charAt(0);
  const match = RECORD_TYPES.find((r) => r.prefix === first);
  return match ? match.bg : 'bg-white dark:bg-transparent';
}

export function NachaFileViewer({ content, open, onClose }: NachaFileViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content ? content.split('\n') : [];

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-8 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Dialog.Title className="text-lg font-semibold">NACHA File Viewer</Dialog.Title>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-wrap gap-x-4 gap-y-2">
            {RECORD_TYPES.map((rt) => (
              <div key={rt.prefix} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className={cn('w-2.5 h-2.5 rounded-sm border border-gray-200', rt.bg)} />
                <span>{rt.prefix} — {rt.label}</span>
              </div>
            ))}
          </div>

          {/* File content */}
          <div className="flex-1 overflow-auto">
            {content ? (
              <pre className="text-xs font-mono leading-6 min-w-max">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn('px-6 py-0.5 flex gap-4', getLineStyle(line))}
                  >
                    <span className="select-none text-gray-400 dark:text-gray-600 w-10 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 whitespace-pre">{line}</span>
                  </div>
                ))}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No file content available
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
