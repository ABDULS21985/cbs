import { useState } from 'react';
import {
  FileText,
  Image,
  FileSpreadsheet,
  Eye,
  Download,
  Tag,
  Trash2,
  Package,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { DocumentFile, DocumentType } from '../../api/documentApi';

interface FileListTableProps {
  documents: DocumentFile[];
  onView: (doc: DocumentFile) => void;
  onDownload: (doc: DocumentFile) => void;
  onTag: (doc: DocumentFile) => void;
  onDelete: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypeIcon({ type }: { type: DocumentType }) {
  if (type === 'IMAGE') return <Image className="w-4 h-4 text-purple-500" />;
  if (type === 'XLSX' || type === 'CSV') return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
}

const TYPE_BADGE_COLORS: Record<DocumentType, string> = {
  PDF: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DOCX: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  XLSX: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IMAGE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TXT: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  CSV: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export function FileListTable({
  documents,
  onView,
  onDownload,
  onTag,
  onDelete,
}: FileListTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAll() {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allChecked = documents.length > 0 && selected.size === documents.length;
  const someChecked = selected.size > 0 && selected.size < documents.length;

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No documents found</p>
        <p className="text-xs mt-1">Try adjusting your search or selecting a different folder</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg mb-3">
          <span className="text-sm font-medium text-primary">
            {selected.size} document{selected.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                selected.forEach((id) => {
                  const doc = documents.find((d) => d.id === id);
                  if (doc) onDownload(doc);
                });
                clearSelection();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              Download as ZIP
            </button>
            <button
              onClick={() => {
                selected.forEach((id) => onDelete(id));
                clearSelection();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="rounded border-border cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Name
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Type
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Size
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Tags
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Uploaded By
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Date
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Entity
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Ver.
              </th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((doc) => {
              const isSelected = selected.has(doc.id);
              const visibleTags = doc.tags.slice(0, 3);
              const extraTags = doc.tags.length - 3;

              return (
                <tr
                  key={doc.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    isSelected && 'bg-primary/5',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(doc.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2.5 max-w-xs">
                    <button
                      onClick={() => onView(doc)}
                      className="flex items-center gap-2 text-left group"
                    >
                      <TypeIcon type={doc.type} />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors truncate max-w-[200px]">
                        {doc.name}
                      </span>
                    </button>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded',
                        TYPE_BADGE_COLORS[doc.type],
                      )}
                    >
                      {doc.type}
                    </span>
                  </td>

                  {/* Size */}
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatBytes(doc.sizeBytes)}
                  </td>

                  {/* Tags */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {extraTags > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          +{extraTags}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Uploaded By */}
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {doc.uploadedBy.split('@')[0]}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(doc.uploadedAt)}
                  </td>

                  {/* Entity Link */}
                  <td className="px-3 py-2.5">
                    {doc.entityId && doc.entityName ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[140px]">
                          {doc.entityType === 'customer'
                            ? 'Cust'
                            : doc.entityType === 'loan'
                              ? 'Loan'
                              : 'Acct'}
                          : {doc.entityName.length > 18 ? doc.entityName.slice(0, 16) + '…' : doc.entityName}
                        </span>
                        <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Version */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground">v{doc.version}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(doc)}
                        title="View"
                        className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDownload(doc)}
                        title="Download"
                        className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onTag(doc)}
                        title="Edit Tags"
                        className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600 transition-colors"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(doc.id)}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-muted-foreground px-1">
        {documents.length} document{documents.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
