import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, FileText, Loader2 } from 'lucide-react';
import { useCustomerDocuments } from '@/features/customers/hooks/useCustomers';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface DocumentsStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  EXPIRED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function DocumentsStep({ state, updateField, onNext, onBack }: DocumentsStepProps) {
  const customerId = state.customerId ?? 0;
  const { data: customerDocs = [], isLoading, isError } = useCustomerDocuments(customerId, !!customerId);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(
    () => new Set(state.documents.map((document) => Number(document.fileRef)).filter(Number.isFinite)),
  );

  const syncSelectedDocuments = (nextSelected: Set<number>) => {
    updateField(
      'documents',
      customerDocs
        .filter((document) => nextSelected.has(document.id))
        .map((document) => ({
          name: document.documentName || document.documentType,
          required: false,
          uploaded: true,
          fileRef: String(document.id),
        })),
    );
  };

  const toggleDocument = (documentId: number) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      syncSelectedDocuments(next);
      return next;
    });
  };

  const attachedCount = selectedDocs.size;

  if (!customerId) {
    return (
      <div className="surface-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Application Documents</h3>
          <p className="text-sm text-muted-foreground">Select a customer first before attaching live documents.</p>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Application Documents</h3>
        <p className="text-sm text-muted-foreground">Attach live customer documents returned by the backend.</p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading customer documents...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Customer documents could not be loaded from the backend.
        </div>
      ) : null}

      {!isLoading && !isError && customerDocs.length === 0 ? (
        <div className="rounded-lg border p-5 text-sm text-muted-foreground flex items-center gap-3">
          <FileText className="w-4 h-4 flex-shrink-0" />
          No customer documents are currently available to attach.
        </div>
      ) : null}

      {!isLoading && !isError && customerDocs.length > 0 ? (
        <div className="space-y-2">
          {customerDocs.map((document) => {
            const selected = selectedDocs.has(document.id);
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => toggleDocument(document.id)}
                className={cn(
                  'w-full rounded-lg border p-4 text-left transition-colors',
                  selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center',
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30',
                    )}>
                      {selected ? <Check className="w-3 h-3" /> : null}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{document.documentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.documentType} {document.documentNumber ? `• ${document.documentNumber}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_STYLES[document.status] ?? 'bg-muted text-foreground')}>
                    {document.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Attached documents</p>
          <span className="text-sm font-semibold">{attachedCount}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Attach the customer records that should accompany this application into credit review.
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          {attachedCount > 0 ? 'Continue' : 'Continue Without Attachments'}
        </button>
      </div>
    </div>
  );
}
