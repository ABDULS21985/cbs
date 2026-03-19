import { useState, useRef } from 'react';
import { X, AlertTriangle, CheckCircle2, HelpCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { SanctionsMatch } from '../../types/sanctions';
import { useConfirmHit, useMarkFalsePositive } from '../../hooks/useSanctions';
import { SideBySideComparison } from './SideBySideComparison';
import { MatchScoreBadge } from './MatchScoreBadge';

interface Props {
  match: SanctionsMatch;
  onClose: () => void;
}

type Decision = 'confirm' | 'false_positive' | 'needs_more_info' | null;

export function MatchReviewPanel({ match, onClose }: Props) {
  const [decision, setDecision] = useState<Decision>(null);
  const [justification, setJustification] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const confirmHit = useConfirmHit();
  const markFalsePositive = useMarkFalsePositive();

  const handleConfirmHit = async () => {
    await confirmHit.mutateAsync(match.id);
    onClose();
  };

  const handleFalsePositive = async () => {
    if (!justification.trim()) return;
    await markFalsePositive.mutateAsync({ id: match.id, justification });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const isPending = confirmHit.isPending || markFalsePositive.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-background shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{match.matchNumber}</span>
              <span className="text-xs font-mono text-muted-foreground">{match.watchlist}</span>
              <MatchScoreBadge score={match.matchScore} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Screened {formatDate(match.screenedAt)} · {match.matchType} match
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Customer info */}
          <div>
            <div className="text-sm font-medium mb-1 text-muted-foreground uppercase tracking-wide text-xs">
              Customer
            </div>
            <div className="text-base font-semibold">{match.customerName}</div>
          </div>

          {/* Side-by-side comparison */}
          <div>
            <div className="text-sm font-medium mb-3">Field-by-Field Comparison</div>
            <SideBySideComparison match={match} />
          </div>

          {/* Decision section */}
          <div className="border-t pt-4">
            <div className="text-sm font-semibold mb-3">Decision</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setDecision('confirm')}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all',
                  decision === 'confirm'
                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-border hover:border-red-300'
                )}
              >
                <AlertTriangle className="w-5 h-5" />
                Confirm Hit
              </button>
              <button
                onClick={() => setDecision('false_positive')}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all',
                  decision === 'false_positive'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-border hover:border-green-300'
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                False Positive
              </button>
              <button
                onClick={() => setDecision('needs_more_info')}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all',
                  decision === 'needs_more_info'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-border hover:border-blue-300'
                )}
              >
                <HelpCircle className="w-5 h-5" />
                Needs More Info
              </button>
            </div>

            {/* Confirm Hit warning */}
            {decision === 'confirm' && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 space-y-3">
                <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm font-medium">
                    This will block customer transactions and escalate to Compliance.
                  </div>
                </div>
                <button
                  onClick={handleConfirmHit}
                  disabled={isPending}
                  className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Processing...' : 'Confirm — Block Customer'}
                </button>
              </div>
            )}

            {/* False Positive justification */}
            {decision === 'false_positive' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this is a false positive..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Supporting Document (optional)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
                  >
                    <Upload className="w-4 h-4" />
                    {fileName ?? 'Click to upload document'}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                </div>
                <button
                  onClick={handleFalsePositive}
                  disabled={isPending || !justification.trim()}
                  className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Processing...' : 'Mark as False Positive'}
                </button>
              </div>
            )}

            {/* Needs more info */}
            {decision === 'needs_more_info' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  The match will be flagged as requiring additional information. The compliance team will be notified.
                </p>
                <button
                  onClick={onClose}
                  className="mt-3 w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Flag for Follow-up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
