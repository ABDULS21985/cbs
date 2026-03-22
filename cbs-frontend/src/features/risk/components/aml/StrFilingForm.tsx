import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Upload, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUpload } from '@/lib/api';
import { useCreateStr } from '../../hooks/useAmlAlerts';
import type { AmlAlert, AmlTransaction, StrReport } from '../../types/aml';

interface Props {
  alert?: AmlAlert;
  transactions?: AmlTransaction[];
  onSuccess?: (str: StrReport) => void;
}

export function StrFilingForm({ alert, transactions = [], onSuccess }: Props) {
  const createStr = useCreateStr();
  const [description, setDescription] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
  const [reviewer, setReviewer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: number; fileName: string }[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await apiUpload<{ id: number; fileName: string }>(
        '/api/v1/documents/upload', file, 'file'
      );
      setUploadedFiles(prev => [...prev, result]);
      toast.success(`File "${file.name}" uploaded`);
    } catch {
      toast.error('File upload failed');
    }
    e.target.value = '';
  };

  const toggleTx = (id: number) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      alertId: alert?.id ?? 0,
      reference: `STR-${alert?.id ?? 0}-${Date.now()}`,
      filedBy: 'Current User',
    };
    createStr.mutate(data, {
      onSuccess: (str) => {
        toast.success('STR submitted successfully');
        setSubmitted(true);
        onSuccess?.(str);
      },
      onError: () => {
        toast.error('Failed to submit STR');
      },
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-base font-semibold">STR Submitted</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The Suspicious Transaction Report has been saved as a draft.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-primary underline"
        >
          File another STR
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="border rounded-lg p-4 bg-card">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Subject Details
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Customer Name</p>
            <p className="font-medium">{alert?.customerName ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Customer Number</p>
            <p className="font-medium font-mono">{alert?.customerNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Alert Number</p>
            <p className="font-medium font-mono">{alert?.alertNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Risk Score</p>
            <p className="font-medium text-red-600">{alert?.riskScore ?? '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Suspicious Activity Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
          placeholder="Describe the suspicious activity in detail, including the nature of the suspicion, transactions involved, and any relevant background..."
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {transactions.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Related Transactions (select all that apply)
          </label>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {transactions.map((tx) => (
              <label
                key={tx.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTxIds.has(tx.id)}
                  onChange={() => toggleTx(tx.id)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date} · {tx.type}</p>
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600',
                )}>
                  {tx.type === 'CREDIT' ? '+' : '-'}
                  {tx.amount.toLocaleString()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Supporting Documents</label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag & drop files or{' '}
            <label className="text-primary cursor-pointer underline">
              browse
              <input type="file" multiple className="sr-only" onChange={handleFileUpload} />
            </label>
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG up to 10MB each</p>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadedFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-sm text-foreground bg-muted/50 rounded-md px-3 py-1.5">
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="truncate">{f.fileName}</span>
                <button
                  type="button"
                  onClick={() => setUploadedFiles(prev => prev.filter(u => u.id !== f.id))}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Filing Officer</label>
          <input
            type="text"
            value="Current User"
            readOnly
            className="w-full border rounded-lg px-3 py-2 text-sm bg-muted cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Reviewer</label>
          <select
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select reviewer...</option>
            <option value="compliance_head">Head of Compliance</option>
            <option value="aml_officer">AML Officer</option>
            <option value="risk_manager">Risk Manager</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          Save as Draft
        </button>
        <button
          type="submit"
          disabled={!description.trim() || createStr.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {createStr.isPending ? 'Submitting…' : 'Submit STR'}
        </button>
      </div>
    </form>
  );
}
