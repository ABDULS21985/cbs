import { X, Download, FileText, ImageIcon } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import type { CustomerDocument } from '../types/customer';

interface DocumentPreviewProps {
  document: CustomerDocument;
  onClose: () => void;
}

export function DocumentPreview({ document: doc, onClose }: DocumentPreviewProps) {
  const isImage = doc.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
  const isPdf = doc.url && /\.pdf$/i.test(doc.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{doc.documentType?.replace(/_/g, ' ')}</h2>
            <p className="text-xs text-muted-foreground font-mono">{doc.documentNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {doc.url && (
              <a href={doc.url} download className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            )}
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6">
          {doc.url ? (
            isImage ? (
              <div className="flex items-center justify-center">
                <img src={doc.url} alt={doc.documentType} className="max-w-full max-h-[60vh] rounded-lg shadow-sm object-contain" />
              </div>
            ) : isPdf ? (
              <iframe src={doc.url} title={doc.documentType} className="w-full h-[60vh] rounded-lg border" />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Preview not available for this file type</p>
                <a href={doc.url} download className="text-sm text-primary hover:underline mt-2">Download to view</a>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Document not available for preview</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="border-t px-6 py-4 flex items-center gap-6 text-xs text-muted-foreground flex-shrink-0 flex-wrap">
          <StatusBadge status={doc.status} dot />
          <span>Type: <span className="font-medium text-foreground">{doc.documentType?.replace(/_/g, ' ')}</span></span>
          {doc.uploadedAt && <span>Uploaded: <span className="font-medium text-foreground">{formatDate(doc.uploadedAt)}</span></span>}
          {doc.expiryDate && <span>Expires: <span className="font-medium text-foreground">{formatDate(doc.expiryDate)}</span></span>}
        </div>
      </div>
    </div>
  );
}
