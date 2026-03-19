import { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, FileImage } from 'lucide-react';
import { type ClearingCheque } from '../../api/chequeApi';
import { formatMoney, formatDate } from '@/lib/formatters';
import { SignatureComparison } from './SignatureComparison';
import { cn } from '@/lib/utils';

interface Props {
  cheque: ClearingCheque | null;
  open: boolean;
  onClose: () => void;
}

export function ChequeImageViewer({ cheque, open, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onClose();
  };

  if (!open || !cheque) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-4xl max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold">Cheque #{cheque.chequeNumber}</h2>
              <p className="text-xs text-muted-foreground">
                {cheque.drawerName} · {cheque.drawerAccount} · {formatMoney(cheque.amount)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-md border text-sm hover:bg-muted transition-colors disabled:opacity-40"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="p-1.5 rounded-md border text-sm hover:bg-muted transition-colors disabled:opacity-40"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={handleClose}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Front</p>
                <div
                  className="overflow-hidden rounded-lg border bg-muted/20 h-48 flex items-center justify-center"
                  style={{ minHeight: '12rem' }}
                >
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    className={cn('flex flex-col items-center justify-center gap-2 select-none')}
                  >
                    <FileImage className="w-12 h-12 text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground font-medium">Cheque Front Scan</span>
                    <span className="text-xs text-muted-foreground/60">#{cheque.chequeNumber}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Back</p>
                <div
                  className="overflow-hidden rounded-lg border bg-muted/20 h-48 flex items-center justify-center"
                  style={{ minHeight: '12rem' }}
                >
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    className="flex flex-col items-center justify-center gap-2 select-none"
                  >
                    <FileImage className="w-12 h-12 text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground font-medium">Cheque Back Scan</span>
                    <span className="text-xs text-muted-foreground/60">#{cheque.chequeNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/10 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Presenting Bank</p>
                <p className="font-medium">{cheque.presentingBank}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received Date</p>
                <p className="font-medium">{formatDate(cheque.receivedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-mono font-semibold">{formatMoney(cheque.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{cheque.status}</p>
              </div>
            </div>

            <SignatureComparison chequeId={cheque.id} />
          </div>
        </div>
      </div>
    </>
  );
}
