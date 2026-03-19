import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { EmptyState } from '@/components/shared';
import { useCustomerDocuments } from '../hooks/useCustomers';

const STATUS_ICONS = {
  VERIFIED: <CheckCircle className="h-4 w-4 text-green-500" />,
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  EXPIRED: <Clock className="h-4 w-4 text-red-500" />,
  REJECTED: <XCircle className="h-4 w-4 text-red-500" />,
};

export function CustomerDocumentsTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data: documents, isLoading } = useCustomerDocuments(customerId, active);

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        Document upload is not exposed by the current backend contract.
      </div>
      {!documents?.length ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="No documents have been uploaded for this customer"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {STATUS_ICONS[doc.status]}
                  <span className="text-sm font-medium truncate">{doc.documentName}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{doc.documentType}</div>
                <div className="text-xs text-gray-400 mt-1">Uploaded {doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</div>
                {doc.expiryDate && (
                  <div className="text-xs text-gray-400">Expires {formatDate(doc.expiryDate)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
