import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';

interface Props {
  message: string;
}

export function SwiftMessageViewer({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-card">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4" /> SWIFT MT103 Message
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? 'Hide' : 'View'}</span>
      </button>
      {expanded && (
        <div className="relative border-t">
          <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-muted rounded-md hover:bg-muted/80">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 max-h-80 overflow-y-auto">
            {message}
          </pre>
        </div>
      )}
    </div>
  );
}
