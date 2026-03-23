import { useState } from 'react';
import { FileText, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  message: string;
}

const SWIFT_HIGHLIGHT_PREFIXES = [':20:', ':32A:', ':50K:', ':59:', ':71A:'];

function highlightSwiftLines(message: string) {
  return message.split('\n').map((line, i) => {
    const isBold = SWIFT_HIGHLIGHT_PREFIXES.some((prefix) => line.trimStart().startsWith(prefix));
    return (
      <span key={i}>
        {isBold ? <strong>{line}</strong> : line}
        {'\n'}
      </span>
    );
  });
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
    <div className="surface-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4" /> SWIFT Message (MT103)
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {expanded ? (
            <>
              Hide <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              View <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </span>
      </button>
      {expanded && (
        <div className="relative border-t">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-muted rounded-md hover:bg-muted/80 flex items-center gap-1 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500">Copied to clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 max-h-80 overflow-y-auto">
            <code>{highlightSwiftLines(message)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
