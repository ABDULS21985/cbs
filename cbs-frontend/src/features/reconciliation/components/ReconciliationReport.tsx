import { useState } from 'react';
import { Calendar, Download, Eye, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ReconciliationReportProps {
  title: string;
  description: string;
  icon: ReactNode;
  onGenerate: (dateFrom: string, dateTo: string) => Promise<void>;
  onPreview?: (dateFrom: string, dateTo: string) => void;
  onDownload?: (dateFrom: string, dateTo: string) => void;
  onEmail?: (dateFrom: string, dateTo: string) => void;
  status?: 'ready' | 'generating' | 'available';
}

export function ReconciliationReport({
  title,
  description,
  icon,
  onGenerate,
  onPreview,
  onDownload,
  onEmail,
  status: externalStatus,
}: ReconciliationReportProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const status = externalStatus ?? (generating ? 'generating' : generated ? 'available' : 'ready');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(dateFrom, dateTo);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="surface-card overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          {/* Status indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0 mt-1.5',
              status === 'available' && 'bg-green-500',
              status === 'generating' && 'bg-amber-500 animate-pulse',
              status === 'ready' && 'bg-gray-300 dark:bg-gray-600',
            )}
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {generating ? 'Generating...' : 'Generate'}
          </button>

          {status === 'available' && (
            <>
              {onPreview && (
                <button
                  onClick={() => onPreview(dateFrom, dateTo)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(dateFrom, dateTo)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
              {onEmail && (
                <button
                  onClick={() => onEmail(dateFrom, dateTo)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
