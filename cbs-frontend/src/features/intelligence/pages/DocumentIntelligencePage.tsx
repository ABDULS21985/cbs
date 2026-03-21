import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, EmptyState, TabsPage, ConfirmDialog } from '@/components/shared';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  FileSearch,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Upload,
  Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useAllDocumentJobs,
  usePendingDocuments,
  useSubmitDocument,
  useReviewDocument,
  type DocumentProcessingJob,
} from '../hooks/useIntelligence';

// ---- Constants ------------------------------------------------------------------

const DOCUMENT_TYPES = [
  'NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'UTILITY_BILL',
  'BANK_STATEMENT', 'TAX_RETURN', 'COMPANY_REGISTRATION', 'PROOF_OF_ADDRESS',
  'EMPLOYMENT_LETTER', 'FINANCIAL_STATEMENT',
] as const;

const PROCESSING_TYPES = [
  'OCR', 'NLP_EXTRACTION', 'CLASSIFICATION', 'VERIFICATION',
  'FRAUD_CHECK', 'SENTIMENT_ANALYSIS', 'SUMMARISATION',
] as const;

const INPUT_FORMATS = ['PDF', 'JPEG', 'PNG', 'TIFF', 'HEIC', 'DOCX'] as const;

const STATUS_MAP: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  EXTRACTED: 'Extracted',
  VERIFIED: 'Verified',
  FAILED: 'Failed',
  MANUAL_REVIEW: 'Manual Review',
};

// ---- Submit Dialog ---------------------------------------------------------------

function SubmitDocumentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const submit = useSubmitDocument();
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [processingType, setProcessingType] = useState(PROCESSING_TYPES[0]);
  const [inputFormat, setInputFormat] = useState<string>(INPUT_FORMATS[0]);
  const [documentId, setDocumentId] = useState('');

  const handleSubmit = () => {
    submit.mutate(
      {
        documentType,
        processingType,
        inputFormat,
        documentId: documentId ? Number(documentId) : undefined,
      } as Partial<DocumentProcessingJob>,
      {
        onSuccess: () => {
          onClose();
          setDocumentId('');
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold">Submit Document for Processing</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Processing Type</label>
            <select
              value={processingType}
              onChange={(e) => setProcessingType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PROCESSING_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Input Format</label>
            <select
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {INPUT_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Document ID (optional)</label>
            <input
              type="number"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Reference to existing document"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submit.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Detail Drawer ---------------------------------------------------------------

function DocumentDetailDrawer({
  job,
  onClose,
}: {
  job: DocumentProcessingJob | null;
  onClose: () => void;
}) {
  const review = useReviewDocument();

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="bg-background w-full max-w-lg h-full overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Document Job Detail</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Job ID</p>
                <p className="text-sm font-mono">{job.jobId}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <StatusBadge status={job.verificationStatus} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Document Type</p>
                <p className="text-sm">{job.documentType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Processing Type</p>
                <p className="text-sm">{job.processingType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Input Format</p>
                <p className="text-sm">{job.inputFormat}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Confidence</p>
                <p className="text-sm tabular-nums">
                  {job.confidenceScore != null ? `${(Number(job.confidenceScore) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Processing Time</p>
                <p className="text-sm tabular-nums">{job.processingTimeMs != null ? `${job.processingTimeMs}ms` : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Model</p>
                <p className="text-sm">{job.modelUsed || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reviewed By</p>
                <p className="text-sm">{job.reviewedBy || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reviewed At</p>
                <p className="text-sm">{job.reviewedAt ? formatDateTime(job.reviewedAt) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDateTime(job.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Document ID</p>
                <p className="text-sm font-mono">{job.documentId ?? '—'}</p>
              </div>
            </div>

            {/* Extracted Data */}
            {job.extractedData && Object.keys(job.extractedData).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Data</p>
                <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(job.extractedData, null, 2)}
                </pre>
              </div>
            )}

            {/* Flags */}
            {job.flags && job.flags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Flags</p>
                <div className="flex flex-wrap gap-1">
                  {job.flags.map((flag, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Review Actions — only for MANUAL_REVIEW or EXTRACTED status */}
            {(job.verificationStatus === 'MANUAL_REVIEW' || job.verificationStatus === 'EXTRACTED') && (
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => review.mutate({ jobId: job.jobId, status: 'VERIFIED' }, { onSuccess: onClose })}
                  disabled={review.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Verify
                </button>
                <button
                  onClick={() => review.mutate({ jobId: job.jobId, status: 'FAILED' }, { onSuccess: onClose })}
                  disabled={review.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function DocumentIntelligencePage() {
  const { data: allJobs = [], isLoading: loadingAll } = useAllDocumentJobs();
  const { data: pendingJobs = [], isLoading: loadingPending } = usePendingDocuments();
  const review = useReviewDocument();
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DocumentProcessingJob | null>(null);

  const pendingCount = pendingJobs.filter(
    (d) => d.verificationStatus === 'MANUAL_REVIEW' || d.verificationStatus === 'EXTRACTED',
  ).length;
  const verifiedCount = allJobs.filter((d) => d.verificationStatus === 'VERIFIED').length;
  const failedCount = allJobs.filter((d) => d.verificationStatus === 'FAILED').length;

  const allColumns: ColumnDef<DocumentProcessingJob>[] = [
    {
      accessorKey: 'jobId',
      header: 'Job ID',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedJob(row.original)}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.jobId}
        </button>
      ),
    },
    {
      accessorKey: 'documentType',
      header: 'Document Type',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue()).replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'processingType',
      header: 'Processing',
      cell: ({ getValue }) => <span className="text-xs">{String(getValue()).replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'inputFormat',
      header: 'Format',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{String(getValue())}</span>,
    },
    {
      accessorKey: 'confidenceScore',
      header: 'Confidence',
      cell: ({ getValue }) => {
        const v = getValue() as number | null;
        return <span className="text-sm tabular-nums">{v != null ? `${(Number(v) * 100).toFixed(1)}%` : '—'}</span>;
      },
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatRelative(String(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedJob(row.original)}
          className="text-muted-foreground hover:text-primary"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const pendingColumns: ColumnDef<DocumentProcessingJob>[] = [
    {
      accessorKey: 'jobId',
      header: 'Job ID',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedJob(row.original)}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.jobId}
        </button>
      ),
    },
    {
      accessorKey: 'documentType',
      header: 'Document Type',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue()).replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{formatRelative(String(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const job = row.original;
        if (job.verificationStatus !== 'MANUAL_REVIEW' && job.verificationStatus !== 'EXTRACTED') {
          return <span className="text-xs text-muted-foreground">Processing...</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => review.mutate({ jobId: job.jobId, status: 'VERIFIED' })}
              disabled={review.isPending}
              className="px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Verify
            </button>
            <button
              onClick={() => review.mutate({ jobId: job.jobId, status: 'FAILED' })}
              disabled={review.isPending}
              className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Document Intelligence"
        subtitle="AI-powered OCR/NLP document extraction, classification, and human-in-the-loop review"
        backTo="/intelligence"
        actions={
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Document
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Jobs" value={allJobs.length} format="number" icon={FileSearch} />
          <StatCard label="Pending Review" value={pendingCount} format="number" icon={Clock} />
          <StatCard label="Verified" value={verifiedCount} format="number" icon={CheckCircle} />
          <StatCard label="Failed" value={failedCount} format="number" icon={AlertTriangle} />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'pending',
              label: 'Pending Review',
              badge: pendingCount || undefined,
              content: (
                <DataTable
                  columns={pendingColumns}
                  data={pendingJobs}
                  isLoading={loadingPending}
                  searchPlaceholder="Search pending documents..."
                />
              ),
            },
            {
              id: 'all',
              label: 'All Jobs',
              content: (
                <DataTable
                  columns={allColumns}
                  data={allJobs}
                  isLoading={loadingAll}
                  searchPlaceholder="Search all document jobs..."
                />
              ),
            },
          ]}
        />
      </div>

      <SubmitDocumentDialog open={showSubmit} onClose={() => setShowSubmit(false)} />
      <DocumentDetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
    </>
  );
}
