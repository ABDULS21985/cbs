import { useState } from 'react';
import { Check, X, FileSignature, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  chequeId: string;
}

type Assessment = 'MATCH' | 'MISMATCH' | null;

export function SignatureComparison({ chequeId: _chequeId }: Props) {
  const [assessment, setAssessment] = useState<Assessment>(null);
  const [zoom, setZoom] = useState(1);
  const [notes, setNotes] = useState('');

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h4 className="text-sm font-semibold">Signature Comparison</h4>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1 rounded border hover:bg-muted" aria-label="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-1 rounded border hover:bg-muted" aria-label="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Cheque Signature</p>
          <div className="overflow-auto rounded-md border-2 border-dashed bg-muted/30">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="h-28 flex flex-col items-center justify-center gap-1.5">
              <FileSignature className="w-8 h-8 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">Signature from Cheque</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Specimen Signature</p>
          <div className="overflow-auto rounded-md border-2 border-dashed bg-muted/30">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} className="h-28 flex flex-col items-center justify-center gap-1.5">
              <FileSignature className="w-8 h-8 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">Specimen on File</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Officer Assessment</p>
        <div className="flex gap-3">
          <button
            onClick={() => setAssessment('MATCH')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors',
              assessment === 'MATCH'
                ? 'bg-green-600 text-white border-green-600'
                : 'hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-950/30',
            )}
          >
            <Check className="w-4 h-4" />
            Match
          </button>
          <button
            onClick={() => setAssessment('MISMATCH')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors',
              assessment === 'MISMATCH'
                ? 'bg-red-600 text-white border-red-600'
                : 'hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-950/30',
            )}
          >
            <X className="w-4 h-4" />
            Mismatch
          </button>
        </div>
        {assessment && (
          <p className={cn(
            'mt-2 text-xs font-medium text-center',
            assessment === 'MATCH' ? 'text-green-600' : 'text-red-600',
          )}>
            {assessment === 'MATCH' ? 'Signatures marked as matching' : 'Signatures marked as mismatched'}
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none" placeholder="Add observations..." />
      </div>
    </div>
  );
}
