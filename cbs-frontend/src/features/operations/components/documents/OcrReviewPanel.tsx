import { useState } from 'react';
import { X, FileText, Shield, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { OcrQueueItem } from '../../api/documentApi';

interface OcrReviewPanelProps {
  item: OcrQueueItem;
  onVerify: (id: string, correctedText: string) => void;
  onClose: () => void;
}

function highlightLowConfidence(text: string, lowConfidenceWords: string[]): React.ReactNode {
  if (!lowConfidenceWords.length) return text;
  const escapedWords = lowConfidenceWords.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isMatch = lowConfidenceWords.some(
      (w) => w.toLowerCase() === part.toLowerCase(),
    );
    if (isMatch) {
      return (
        <mark
          key={i}
          className="bg-amber-200 text-amber-900 dark:bg-amber-700/40 dark:text-amber-300 rounded px-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function OcrReviewPanel({ item, onVerify, onClose }: OcrReviewPanelProps) {
  const [editedText, setEditedText] = useState(item.extractedText ?? '');
  const [verifying, setVerifying] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const isVerified = item.status === 'VERIFIED';

  async function handleVerify() {
    setVerifying(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      onVerify(item.id, editedText);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } finally {
      setSavingDraft(false);
    }
  }

  const accuracy = item.accuracy;
  const accuracyColor =
    accuracy === undefined
      ? 'text-muted-foreground'
      : accuracy >= 95
        ? 'text-green-700 dark:text-green-400'
        : accuracy >= 80
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-red-700 dark:text-red-400';

  return (
    <div className="flex flex-col h-full bg-card border-l border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              OCR Review
            </span>
            {accuracy !== undefined && (
              <span className={cn('text-xs font-bold', accuracyColor)}>
                {accuracy.toFixed(1)}% accuracy
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <Shield className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold truncate">{item.documentName}</h3>
          {item.processedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Processed {formatDateTime(item.processedAt)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Side-by-side content */}
      <div className="flex flex-1 overflow-hidden divide-x divide-border min-h-0">
        {/* Left: Document Placeholder */}
        <div className="w-2/5 flex flex-col p-4 overflow-auto">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Original Document
          </h4>
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-border gap-3 py-8 min-h-[200px]">
            <FileText className="w-10 h-10 text-gray-400" />
            <div className="text-center px-3">
              <p className="text-sm font-medium text-muted-foreground">{item.documentName}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {item.pages} page{item.pages !== 1 ? 's' : ''} · {item.type}
              </p>
            </div>
            <span className="text-xs text-muted-foreground/40 italic">
              Document viewer would render here
            </span>
          </div>
        </div>

        {/* Right: Extracted Text */}
        <div className="flex-1 flex flex-col p-4 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Extracted Text
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {editedText.length} chars
              </span>
              {item.lowConfidenceWords && item.lowConfidenceWords.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  {item.lowConfidenceWords.length} uncertain
                </span>
              )}
            </div>
          </div>

          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            readOnly={isVerified}
            className={cn(
              'flex-1 min-h-[200px] p-3 text-xs font-mono rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed',
              isVerified && 'cursor-default opacity-80',
            )}
            placeholder="No extracted text available..."
          />
        </div>
      </div>

      {/* Low Confidence Words */}
      {item.lowConfidenceWords && item.lowConfidenceWords.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-amber-50/40 dark:bg-amber-900/10 shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Low-confidence words — please verify:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.lowConfidenceWords.map((word, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300 font-mono"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text preview with highlights */}
      {item.extractedText && item.lowConfidenceWords && item.lowConfidenceWords.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            Highlighted Preview (amber = uncertain):
          </p>
          <div className="text-xs font-mono leading-relaxed line-clamp-3">
            {highlightLowConfidence(item.extractedText, item.lowConfidenceWords)}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {!isVerified && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
              draftSaved
                ? 'border-green-300 text-green-700 bg-green-50'
                : 'border-border hover:bg-muted',
            )}
          >
            {draftSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {savingDraft ? 'Saving…' : 'Save Draft'}
              </>
            )}
          </button>

          <button
            onClick={handleVerify}
            disabled={verifying || !editedText.trim()}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors',
              verifying || !editedText.trim()
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700',
            )}
          >
            <Shield className="w-4 h-4" />
            {verifying ? 'Verifying…' : 'Verify & Save'}
          </button>
        </div>
      )}

      {isVerified && (
        <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-border bg-green-50/40 dark:bg-green-900/10 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            This document has been verified
          </span>
        </div>
      )}
    </div>
  );
}
