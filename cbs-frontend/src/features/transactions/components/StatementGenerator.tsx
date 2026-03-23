import { useEffect, useState } from 'react';
import { Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { transactionApi, type StatementRequest } from '../api/transactionApi';

interface StatementGeneratorProps {
  open: boolean;
  initialAccountNumber?: string;
  initialEmail?: string;
  onClose: () => void;
}

function todayStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function StatementGenerator({
  open,
  initialAccountNumber,
  initialEmail,
  onClose,
}: StatementGeneratorProps) {
  const [request, setRequest] = useState<StatementRequest>({
    accountNumber: initialAccountNumber ?? '',
    fromDate: '',
    toDate: todayStamp(),
    format: 'PDF',
    emailToHolder: false,
    emailAddress: initialEmail ?? '',
  });
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRequest((current) => ({
        ...current,
        accountNumber: initialAccountNumber ?? current.accountNumber,
        emailAddress: initialEmail ?? current.emailAddress,
      }));
    }
  }, [initialAccountNumber, initialEmail, open]);

  if (!open) {
    return null;
  }

  const handleDownload = async () => {
    if (!request.accountNumber.trim() || !request.fromDate || !request.toDate) {
      toast.error('Account and date range are required');
      return;
    }
    setSubmitting(true);
    try {
      await transactionApi.downloadStatement(request);
      toast.success('Statement download started');
      onClose();
    } catch {
      toast.error('Failed to generate statement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmail = async () => {
    if (!request.accountNumber.trim() || !request.fromDate || !request.toDate) {
      toast.error('Account and date range are required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await transactionApi.emailStatement({ ...request, emailToHolder: true });
      toast.success(response.message);
      onClose();
    } catch {
      toast.error('Failed to queue statement delivery');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-xl surface-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold">Generate Statement</h3>
              <p className="mt-1 text-sm text-muted-foreground">Download or email a formatted BellBank account statement.</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Account Number</label>
              <input
                value={request.accountNumber}
                onChange={(event) => setRequest((current) => ({ ...current, accountNumber: event.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">From Date</label>
              <input
                type="date"
                value={request.fromDate}
                onChange={(event) => setRequest((current) => ({ ...current, fromDate: event.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">To Date</label>
              <input
                type="date"
                value={request.toDate}
                onChange={(event) => setRequest((current) => ({ ...current, toDate: event.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Format</label>
              <select
                value={request.format}
                onChange={(event) => setRequest((current) => ({ ...current, format: event.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="PDF">PDF</option>
                <option value="HTML">HTML</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email Address</label>
              <input
                value={request.emailAddress}
                onChange={(event) => setRequest((current) => ({ ...current, emailAddress: event.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEmail}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email
              </button>
              <button
                onClick={handleDownload}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
