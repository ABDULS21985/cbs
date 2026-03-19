import { useRef, useState } from 'react';
import { Download, Mail, Printer, FileSpreadsheet, FileText, X, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatementPdfTemplate } from './StatementPdfTemplate';
import type { StatementData, StatementFormat } from '../api/statementApi';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatementPreviewProps {
  data: StatementData | null;
  loading: boolean;
  onDownload: (format: StatementFormat) => void;
  onEmail: (email: string) => void;
}

// ─── Email Dialog ─────────────────────────────────────────────────────────────

interface EmailDialogProps {
  open: boolean;
  defaultEmail?: string;
  onClose: () => void;
  onSend: (email: string) => void;
  isSending: boolean;
}

function EmailDialog({ open, defaultEmail = '', onClose, onSend, isSending }: EmailDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSend = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    onSend(email);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Email Statement</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Send this statement to a customer email address.
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? 'Sending…' : 'Send Statement'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function StatementSkeleton() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex justify-between pb-4 border-b">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
          <div className="h-3 w-40 bg-gray-100 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-36 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Account details */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-300 rounded" />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded p-2.5 text-center space-y-1">
            <div className="h-2.5 w-20 bg-gray-200 rounded mx-auto" />
            <div className="h-5 w-28 bg-gray-300 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StatementPreview({ data, loading, onDownload, onEmail }: StatementPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailSend = async (email: string) => {
    setIsSending(true);
    try {
      await onEmail(email);
      setEmailSent(true);
      setTimeout(() => {
        setEmailDialogOpen(false);
        setEmailSent(false);
      }, 1500);
    } finally {
      setIsSending(false);
    }
  };

  // Empty state
  if (!loading && !data) {
    return (
      <div className="rounded-lg border bg-card h-full min-h-[400px] flex items-center justify-center">
        <EmptyState
          icon={FileText}
          title="No statement generated"
          description="Fill in the form and click Generate Statement to preview your account statement here."
        />
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-28 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <StatementSkeleton />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>

        <button
          onClick={() => onDownload('PDF')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>

        <button
          onClick={() => onDownload('CSV')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download CSV
        </button>

        <button
          onClick={() => onDownload('EXCEL')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Download Excel
        </button>

        <button
          onClick={() => setEmailDialogOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors',
            emailSent
              ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20'
              : 'hover:bg-muted',
          )}
        >
          <Mail className="w-4 h-4" />
          {emailSent ? 'Email Sent!' : 'Email to Customer'}
        </button>
      </div>

      {/* ── Preview ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border shadow-sm overflow-auto bg-white">
        <div className="p-6">
          <StatementPdfTemplate ref={printRef} data={data} />
        </div>
      </div>

      {/* ── Email Dialog ─────────────────────────────────────────────── */}
      <EmailDialog
        open={emailDialogOpen}
        defaultEmail=""
        onClose={() => setEmailDialogOpen(false)}
        onSend={handleEmailSend}
        isSending={isSending}
      />
    </div>
  );
}
