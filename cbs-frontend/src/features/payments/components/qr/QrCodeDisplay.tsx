import { useEffect, useRef, useState } from 'react';
import { Download, Printer, Share2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { QrCode } from '../../api/qrApi';

interface QrCodeDisplayProps {
  qr: QrCode;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function QrSvgGrid({ data }: { data: string }) {
  const size = 29;
  const cellSize = 8;
  const hash = hashCode(data);

  const cells: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      const seed = hash ^ (r * 31 + c * 17);
      cells[r][c] = ((seed >>> (r % 32)) & 1) === 1;
    }
  }

  // Force finder patterns (top-left, top-right, bottom-left) for QR look
  const setFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[startR + r][startC + c] = isOuter || isInner;
      }
    }
  };

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  const totalSize = size * cellSize;

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      className="rounded-sm"
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width={totalSize} height={totalSize} fill="white" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1a1a1a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function QrCodeDisplay({ qr }: QrCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = new Date(qr.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSecondsLeft(() => {
      const diff = new Date(qr.expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    });
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qr.expiresAt]);

  const isExpired = secondsLeft <= 0;
  const isWarning = secondsLeft > 0 && secondsLeft < 60;

  const handleDownload = () => {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) {
      toast.error('Unable to download QR code');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const padding = 40;
    const svgSize = 232;
    canvas.width = svgSize + padding * 2;
    canvas.height = svgSize + padding * 2 + 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, svgSize, svgSize);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BellBank', canvas.width / 2, svgSize + padding + 24);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(qr.accountName, canvas.width / 2, svgSize + padding + 44);
      ctx.fillText(qr.accountNumber, canvas.width / 2, svgSize + padding + 62);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `bellbank-qr-${qr.qrId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code downloaded');
    };
    img.src = url;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Pay ${qr.accountName} via BellBank QR\nAccount: ${qr.accountNumber}${qr.amount ? `\nAmount: ${formatMoney(qr.amount, qr.currency)}` : ''}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Payment details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy to clipboard');
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col items-center gap-4">
      <div className="text-center">
        <h3 className="text-base font-semibold">Scan to Pay</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Use any mobile banking or payment app</p>
      </div>

      <div
        ref={qrRef}
        className={cn(
          'p-4 rounded-xl border-2 bg-white shadow-sm transition-opacity',
          isExpired && 'opacity-40',
        )}
      >
        <QrSvgGrid data={qr.qrData} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-foreground">BellBank</p>
        <p className="text-sm font-medium">{qr.accountName}</p>
        <p className="text-xs text-muted-foreground font-mono">{qr.accountNumber}</p>
        {qr.amount ? (
          <p className="text-base font-semibold text-primary mt-1">
            {formatMoney(qr.amount, qr.currency)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Any Amount</p>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full',
          isExpired
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            : isWarning
            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
            : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        )}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isExpired ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500',
          )}
        />
        {isExpired ? 'QR Code Expired' : `Expires in ${formatCountdown(secondsLeft)}`}
      </div>

      <div className="flex gap-2 w-full">
        <button
          onClick={handleDownload}
          disabled={isExpired}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={handlePrint}
          disabled={isExpired}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
}
