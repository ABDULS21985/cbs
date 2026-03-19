import { X, FileText, Image, FileSpreadsheet, Download, ExternalLink, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { DocumentFile, DocumentType } from '../../api/documentApi';

interface DocumentPreviewProps {
  document: DocumentFile | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_COLORS: Record<DocumentType, string> = {
  PDF: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DOCX: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  XLSX: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IMAGE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TXT: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  CSV: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const RETENTION_COLORS: Record<string, string> = {
  KYC: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  TRANSACTION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  LOAN: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  INTERNAL: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  REGULATORY: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  CORRESPONDENCE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
};

function PdfPreview({ doc }: { doc: DocumentFile }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 gap-4 min-h-[240px] border border-dashed border-border">
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
        <FileText className="w-10 h-10 text-red-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/70">{doc.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF Preview — would render here
        </p>
      </div>
      <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <Download className="w-4 h-4" />
        Download PDF
      </button>
    </div>
  );
}

function ImagePreview({ doc }: { doc: DocumentFile }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border min-h-[240px] flex items-center justify-center">
      <div
        className="w-full h-60 flex flex-col items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #ddd6fe 100%)',
        }}
        aria-label={doc.name}
      >
        <Image className="w-12 h-12 text-indigo-400 opacity-60" />
        <span className="text-xs text-indigo-600 font-medium">{doc.name}</span>
      </div>
    </div>
  );
}

function DocxXlsxPreview({ doc }: { doc: DocumentFile }) {
  const Icon = doc.type === 'XLSX' || doc.type === 'CSV' ? FileSpreadsheet : FileText;
  const color =
    doc.type === 'XLSX' || doc.type === 'CSV' ? 'text-green-500' : 'text-blue-500';
  const bgColor =
    doc.type === 'XLSX' || doc.type === 'CSV'
      ? 'bg-green-50 dark:bg-green-900/20'
      : 'bg-blue-50 dark:bg-blue-900/20';

  return (
    <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-8 gap-4 min-h-[240px] border border-dashed border-border">
      <div className={cn('p-4 rounded-full', bgColor)}>
        <Icon className={cn('w-10 h-10', color)} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/70">{doc.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {doc.type} file — open in external viewer
        </p>
      </div>
      <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
        <ExternalLink className="w-4 h-4" />
        Open in Viewer
      </button>
    </div>
  );
}

export function DocumentPreview({ document: doc, onClose }: DocumentPreviewProps) {
  if (!doc) return null;

  return (
    <div className="flex flex-col h-full w-full bg-card border-l border-border overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded',
                TYPE_COLORS[doc.type],
              )}
            >
              {doc.type}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(doc.sizeBytes)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(doc.uploadedAt)}
            </span>
          </div>
          <h3 className="text-sm font-semibold mt-1 leading-snug break-all">{doc.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
          title="Close"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="px-4 py-4 border-b border-border">
        {doc.type === 'PDF' && <PdfPreview doc={doc} />}
        {doc.type === 'IMAGE' && <ImagePreview doc={doc} />}
        {(doc.type === 'DOCX' ||
          doc.type === 'XLSX' ||
          doc.type === 'TXT' ||
          doc.type === 'CSV') && <DocxXlsxPreview doc={doc} />}
      </div>

      {/* Metadata Panel */}
      <div className="px-4 py-4 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Document Details
        </h4>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.length > 0 ? (
              doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/50">No tags</span>
            )}
          </div>
        </div>

        {/* Entity Link */}
        {doc.entityId && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Linked Entity</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium capitalize">
                {doc.entityType}
              </span>
              <span className="text-xs font-medium">{doc.entityName}</span>
              <span className="text-xs text-muted-foreground">({doc.entityId})</span>
            </div>
          </div>
        )}

        {/* Retention Info */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Retention</span>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded',
                RETENTION_COLORS[doc.retentionClass],
              )}
            >
              {doc.retentionClass}
            </span>
            {doc.retentionUntil && (
              <span className="text-xs text-muted-foreground">
                Until {formatDate(doc.retentionUntil)}
              </span>
            )}
          </div>
        </div>

        {/* Upload Details */}
        <div className="pt-2 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Uploaded By</span>
            <span className="font-medium">{doc.uploadedBy.split('@')[0]}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono font-medium">v{doc.version}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Folder</span>
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
              {doc.folder}
            </span>
          </div>
          {doc.ocrProcessed !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">OCR</span>
              <span
                className={cn(
                  'text-[11px] font-medium px-1.5 py-0.5 rounded',
                  doc.ocrProcessed
                    ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                    : 'text-gray-500 bg-gray-100 dark:bg-gray-800',
                )}
              >
                {doc.ocrProcessed ? 'Processed' : 'Not processed'}
              </span>
            </div>
          )}
        </div>

        {/* OCR Extracted Text Preview */}
        {doc.extractedText && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Extracted Text Preview</span>
            <div className="mt-1.5 p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground font-mono leading-relaxed max-h-28 overflow-y-auto">
              {doc.extractedText.slice(0, 300)}
              {doc.extractedText.length > 300 && '…'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
