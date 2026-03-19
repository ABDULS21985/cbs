import { useState, useMemo, useEffect } from 'react';
import { Search, Upload, X } from 'lucide-react';
import { FolderTree } from './FolderTree';
import { FileListTable } from './FileListTable';
import { DocumentPreview } from './DocumentPreview';
import { DocumentUploader } from './DocumentUploader';
import { MetadataPanel } from './MetadataPanel';
import type { DocumentFile, DocumentFolder } from '../../api/documentApi';
import { updateDocumentTags, deleteDocument } from '../../api/documentApi';

interface DocumentLibraryProps {
  documents: DocumentFile[];
  onUpload: (files: File[], folder: DocumentFolder, tags: string[]) => Promise<void>;
}

const FOLDER_LABELS: Record<string, string> = {
  'customer/kyc': 'Customer / KYC',
  'customer/agreements': 'Customer / Agreements',
  'customer/correspondence': 'Customer / Correspondence',
  'loan/applications': 'Loan / Applications',
  'loan/collateral': 'Loan / Collateral',
  'loan/legal': 'Loan / Legal',
  'regulatory/cbn': 'Regulatory / CBN Returns',
  'regulatory/ndic': 'Regulatory / NDIC Returns',
  'internal/policies': 'Internal / Policies',
  'internal/procedures': 'Internal / Procedures',
  'internal/training': 'Internal / Training',
  templates: 'Templates',
};

export function DocumentLibrary({ documents: initialDocuments, onUpload }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(initialDocuments);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [tagDoc, setTagDoc] = useState<DocumentFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Sync when parent documents change
  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const documentCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      counts[doc.folder] = (counts[doc.folder] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    let result = documents;
    if (selectedFolder) {
      result = result.filter((d) => d.folder === selectedFolder);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.entityName?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [documents, selectedFolder, search]);

  async function handleDelete(id: string) {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (previewDoc?.id === id) setPreviewDoc(null);
    if (tagDoc?.id === id) setTagDoc(null);
  }

  async function handleSaveTags(updates: Partial<DocumentFile>) {
    if (!tagDoc) return;
    const updated = await updateDocumentTags(tagDoc.id, updates.tags ?? tagDoc.tags);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setTagDoc((prev) => (prev?.id === updated.id ? updated : prev));
    setPreviewDoc((prev) => (prev?.id === updated.id ? updated : prev));
  }

  async function handleUpload(files: File[], folder: DocumentFolder, tags: string[]) {
    await onUpload(files, folder, tags);
    setUploadOpen(false);
  }

  const showPreview = previewDoc !== null;
  const showTagPanel = tagDoc !== null && !showPreview;

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Folder Tree */}
      <aside className="w-64 shrink-0 border-r border-border overflow-y-auto">
        <FolderTree
          selectedFolder={selectedFolder}
          onSelect={(f) => {
            setSelectedFolder(f);
            setPreviewDoc(null);
            setTagDoc(null);
          }}
          documentCounts={documentCounts}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sub-header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold">
              {selectedFolder ? FOLDER_LABELS[selectedFolder] : 'All Documents'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>
        </div>

        {/* Table + Side Panels */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <FileListTable
              documents={filteredDocuments}
              onView={(doc) => {
                setPreviewDoc(doc);
                setTagDoc(null);
              }}
              onDownload={(doc) => {
                // Mock download: create a toast-like notification
                console.log('Downloading:', doc.name);
              }}
              onTag={(doc) => {
                setTagDoc(doc);
                setPreviewDoc(null);
              }}
              onDelete={handleDelete}
            />
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <aside className="w-80 shrink-0 border-l border-border overflow-y-auto">
              <DocumentPreview
                document={previewDoc}
                onClose={() => setPreviewDoc(null)}
              />
            </aside>
          )}

          {/* Tag/Metadata Panel */}
          {showTagPanel && tagDoc && (
            <aside className="w-80 shrink-0 border-l border-border overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Edit Metadata</h4>
                <button
                  onClick={() => setTagDoc(null)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4 truncate">{tagDoc.name}</p>
              <MetadataPanel document={tagDoc} onSave={handleSaveTags} />
            </aside>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setUploadOpen(false)}
          />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold">Upload Documents</h3>
              <button
                onClick={() => setUploadOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5">
              <DocumentUploader
                currentFolder={selectedFolder ?? undefined}
                onUpload={handleUpload}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
