import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { DocumentLibrary } from '../components/documents/DocumentLibrary';
import { OcrQueueTable } from '../components/documents/OcrQueueTable';
import { OcrReviewPanel } from '../components/documents/OcrReviewPanel';
import { DocumentTemplateEditor } from '../components/documents/DocumentTemplateEditor';
import { RetentionPolicyTable } from '../components/documents/RetentionPolicyTable';
import {
  getDocuments,
  getOcrQueue,
  getDocumentTemplates,
  getRetentionPolicies,
  uploadDocument,
  verifyOcrItem,
  submitOcrCorrection,
  generateFromTemplate,
  updateRetentionPolicy,
  runRetentionCheck,
} from '../api/documentApi';
import type {
  DocumentFile,
  OcrQueueItem,
  DocumentTemplate,
  RetentionPolicy,
  DocumentFolder,
} from '../api/documentApi';

type Tab = 'library' | 'ocr' | 'templates' | 'retention';

export function DocumentManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('library');

  // Library state
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // OCR state
  const [ocrItems, setOcrItems] = useState<OcrQueueItem[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedOcrItem, setSelectedOcrItem] = useState<OcrQueueItem | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Retention state
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [retentionLoading, setRetentionLoading] = useState(false);

  // Load documents on mount
  useEffect(() => {
    setDocsLoading(true);
    getDocuments().then((docs) => {
      setDocuments(docs);
      setDocsLoading(false);
    });
  }, []);

  // Load OCR queue when tab is active
  useEffect(() => {
    if (activeTab === 'ocr' && ocrItems.length === 0) {
      setOcrLoading(true);
      getOcrQueue().then((items) => {
        setOcrItems(items);
        setOcrLoading(false);
      });
    }
  }, [activeTab]);

  // Load templates when tab is active
  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) {
      setTemplatesLoading(true);
      getDocumentTemplates().then((tpls) => {
        setTemplates(tpls);
        setTemplatesLoading(false);
      });
    }
  }, [activeTab]);

  // Load retention policies when tab is active
  useEffect(() => {
    if (activeTab === 'retention' && retentionPolicies.length === 0) {
      setRetentionLoading(true);
      getRetentionPolicies().then((policies) => {
        setRetentionPolicies(policies);
        setRetentionLoading(false);
      });
    }
  }, [activeTab]);

  // Handlers
  async function handleUpload(files: File[], folder: DocumentFolder, tags: string[]) {
    for (const file of files) {
      const newDoc = await uploadDocument(file, folder, tags);
      setDocuments((prev) => [newDoc, ...prev]);
    }
  }

  async function handleOcrVerify(id: string, correctedText: string) {
    await submitOcrCorrection(id, correctedText);
    const verified = await verifyOcrItem(id);
    setOcrItems((prev) => prev.map((i) => (i.id === id ? verified : i)));
    setSelectedOcrItem(verified);
  }

  async function handleRequeue(id: string) {
    setOcrItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'QUEUED' as const } : i)),
    );
  }

  async function handleGenerate(templateId: string, entityId: string, entityType: string) {
    await generateFromTemplate(templateId, entityId, entityType);
  }

  async function handleUpdateRetention(id: string, data: Partial<RetentionPolicy>) {
    const updated = await updateRetentionPolicy(id, data);
    setRetentionPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  async function handleRunRetentionCheck() {
    await runRetentionCheck();
  }

  const ocrPendingCount = ocrItems.filter(
    (i) => i.status === 'QUEUED' || i.status === 'PROCESSING' || i.status === 'COMPLETED',
  ).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'library', label: 'Library' },
    { id: 'ocr', label: 'OCR Queue', badge: ocrPendingCount > 0 ? ocrPendingCount : undefined },
    { id: 'templates', label: 'Templates' },
    { id: 'retention', label: 'Retention Policy' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Document Management"
        subtitle="Centralised repository for all banking documents with OCR and retention management"
        actions={
          <button
            onClick={() => setActiveTab('library')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-border mb-0 px-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedOcrItem(null);
              }}
              className={cn(
                'flex items-center gap-2 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Library Tab */}
        {activeTab === 'library' && (
          docsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm">Loading documents…</p>
              </div>
            </div>
          ) : (
            <DocumentLibrary documents={documents} onUpload={handleUpload} />
          )
        )}

        {/* OCR Queue Tab */}
        {activeTab === 'ocr' && (
          <div className="flex h-full min-h-0 overflow-hidden">
            <div className={cn('flex-1 overflow-y-auto p-6', selectedOcrItem && 'lg:pr-3')}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">OCR Processing Queue</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review and verify OCR-extracted text from uploaded documents
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {ocrItems.filter((i) => i.status === 'VERIFIED').length} verified
                    </span>
                    <span>
                      {ocrItems.filter((i) => i.status === 'COMPLETED').length} awaiting review
                    </span>
                    <span>
                      {ocrItems.filter((i) => i.status === 'FAILED').length} failed
                    </span>
                  </div>
                </div>

                {ocrLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : (
                  <OcrQueueTable
                    items={ocrItems}
                    onReview={(item) => setSelectedOcrItem(item)}
                    onRequeue={handleRequeue}
                  />
                )}
              </div>
            </div>

            {/* OCR Review Side Panel */}
            {selectedOcrItem && (
              <aside className="w-[520px] shrink-0 border-l border-border overflow-hidden flex flex-col">
                <OcrReviewPanel
                  item={selectedOcrItem}
                  onVerify={handleOcrVerify}
                  onClose={() => setSelectedOcrItem(null)}
                />
              </aside>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="overflow-y-auto h-full p-6">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <DocumentTemplateEditor
                templates={templates}
                onGenerate={handleGenerate}
              />
            )}
          </div>
        )}

        {/* Retention Policy Tab */}
        {activeTab === 'retention' && (
          <div className="overflow-y-auto h-full p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Document Retention Policies</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage document retention periods in compliance with CBN and regulatory requirements
                </p>
              </div>

              {retentionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <RetentionPolicyTable
                  policies={retentionPolicies}
                  onUpdate={handleUpdateRetention}
                  onRunCheck={handleRunRetentionCheck}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
