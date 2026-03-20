import { useState } from 'react';
import {
  FileText, CheckCircle, Clock, XCircle, Plus, Eye,
  Trash2, Upload, ShieldCheck, ShieldX, Loader2, X,
  CreditCard, Fingerprint, BookOpen, Building2, Receipt,
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCustomerDocuments,
  useVerifyIdentification,
  useDeleteIdentification,
} from '../hooks/useCustomers';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentPreview } from './DocumentPreview';
import { DocumentExpiryTracker } from './DocumentExpiryTracker';
import type { CustomerDocument } from '../types/customer';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; borderColor: string; bgColor: string; label: string }> = {
  VERIFIED: { icon: CheckCircle, color: 'text-green-600', borderColor: 'border-green-300 dark:border-green-800/40', bgColor: 'bg-green-50/50 dark:bg-green-900/5', label: 'Verified' },
  PENDING: { icon: Clock, color: 'text-amber-600', borderColor: 'border-amber-300 dark:border-amber-800/40', bgColor: 'bg-amber-50/50 dark:bg-amber-900/5', label: 'Pending' },
  EXPIRED: { icon: XCircle, color: 'text-red-600', borderColor: 'border-red-300 dark:border-red-800/40', bgColor: 'bg-red-50/50 dark:bg-red-900/5', label: 'Expired' },
  REJECTED: { icon: ShieldX, color: 'text-red-600', borderColor: 'border-red-300 dark:border-red-800/40', bgColor: 'bg-red-50/50 dark:bg-red-900/5', label: 'Rejected' },
};

const DOC_ICONS: Record<string, typeof FileText> = {
  NIN: Fingerprint,
  NATIONAL_ID: Fingerprint,
  INTERNATIONAL_PASSPORT: BookOpen,
  PASSPORT: BookOpen,
  DRIVERS_LICENSE: CreditCard,
  VOTERS_CARD: CreditCard,
  VOTER_ID: CreditCard,
  CERTIFICATE_OF_INCORPORATION: Building2,
  TIN_CERTIFICATE: Receipt,
  BVN: Fingerprint,
  UTILITY_BILL: Receipt,
  BANK_REFERENCE: Building2,
};

const FILTER_TABS = ['All', 'PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'] as const;

// ─── Reject Dialog ──────────────────────────────────────────────────────────

function RejectDialog({ onClose, onReject }: { onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold">Reject Document</h3>
        <p className="text-sm text-muted-foreground">Provide a reason for rejection.</p>
        <textarea className="w-full input h-20 resize-none" placeholder="e.g. Document is blurred..." value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => onReject(reason)} disabled={!reason.trim()} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">Reject</button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Card ──────────────────────────────────────────────────────────

function DocumentCard({
  doc, customerId, onPreview,
}: {
  doc: CustomerDocument;
  customerId: number;
  onPreview: (d: CustomerDocument) => void;
}) {
  const verify = useVerifyIdentification();
  const deleteMutation = useDeleteIdentification();
  const [showReject, setShowReject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const config = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const DocIcon = DOC_ICONS[doc.documentType] ?? FileText;
  const isPending = doc.status === 'PENDING';
  const canReupload = doc.status === 'EXPIRED' || doc.status === 'REJECTED';

  // Expiry coloring
  const expiryDays = doc.expiryDate ? Math.floor((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const expiryColor = expiryDays !== null
    ? expiryDays < 0 ? 'text-red-600 font-medium' : expiryDays < 30 ? 'text-amber-600 font-medium' : 'text-muted-foreground'
    : 'text-muted-foreground';

  const maskedNumber = doc.documentNumber
    ? doc.documentNumber.length > 4 ? `***${doc.documentNumber.slice(-4)}` : doc.documentNumber
    : '—';

  const handleVerify = () => {
    verify.mutate({ customerId, docId: doc.id, decision: 'VERIFIED' }, {
      onSuccess: () => toast.success('Document verified'),
      onError: () => toast.error('Verification failed'),
    });
  };

  const handleReject = (reason: string) => {
    verify.mutate({ customerId, docId: doc.id, decision: 'REJECTED', reason }, {
      onSuccess: () => { toast.success('Document rejected'); setShowReject(false); },
      onError: () => toast.error('Rejection failed'),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ customerId, docId: doc.id }, {
      onSuccess: () => toast.success('Document deleted'),
      onError: () => toast.error('Delete failed'),
    });
  };

  return (
    <>
      {showReject && <RejectDialog onClose={() => setShowReject(false)} onReject={handleReject} />}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-xs p-6 space-y-4">
            <h3 className="font-semibold">Delete Document?</h3>
            <p className="text-sm text-muted-foreground">This will permanently remove this document.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={() => { handleDelete(); setShowDeleteConfirm(false); }} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className={cn('rounded-xl border-2 p-4 space-y-3 transition-colors', config.borderColor, config.bgColor)}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', doc.status === 'VERIFIED' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted')}>
            <DocIcon className={cn('w-5 h-5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{doc.documentType?.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground font-mono">{maskedNumber}</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold', config.color,
            doc.status === 'VERIFIED' ? 'bg-green-100 dark:bg-green-900/20' :
            doc.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/20' :
            'bg-red-100 dark:bg-red-900/20',
          )}>
            <StatusIcon className="w-3.5 h-3.5" /> {config.label}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Issued: </span>
            <span>{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Expires: </span>
            <span className={expiryColor}>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-1 flex-wrap">
          {doc.url && (
            <button onClick={() => onPreview(doc)} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium hover:bg-muted">
              <Eye className="w-3 h-3" /> View
            </button>
          )}
          {isPending && (
            <>
              <button onClick={handleVerify} disabled={verify.isPending} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 text-white text-[10px] font-medium hover:bg-green-700 disabled:opacity-50">
                {verify.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Verify
              </button>
              <button onClick={() => setShowReject(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-medium hover:bg-red-700">
                <ShieldX className="w-3 h-3" /> Reject
              </button>
            </>
          )}
          {canReupload && (
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium text-primary hover:bg-primary/5">
              <Upload className="w-3 h-3" /> Re-upload
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 ml-auto">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CustomerDocumentsTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data: documents = [], isLoading } = useCustomerDocuments(customerId, active);
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CustomerDocument | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const filtered = filter === 'All' ? documents : documents.filter((d) => d.status === filter);
  const verified = documents.filter((d) => d.status === 'VERIFIED').length;
  const pending = documents.filter((d) => d.status === 'PENDING').length;
  const expired = documents.filter((d) => d.status === 'EXPIRED').length;
  const rejected = documents.filter((d) => d.status === 'REJECTED').length;

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showUpload && <DocumentUploadDialog customerId={customerId} onClose={() => setShowUpload(false)} />}
      {previewDoc && <DocumentPreview document={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {/* Summary stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        {verified > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">{verified} verified</span>}
        {pending > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{pending} pending</span>}
        {expired > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{expired} expired</span>}
        {rejected > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{rejected} rejected</span>}
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 ml-auto">
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </button>
      </div>

      {/* Expiry tracker */}
      <DocumentExpiryTracker documents={documents} />

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {FILTER_TABS.map((tab) => {
          const count = tab === 'All' ? documents.length : documents.filter((d) => d.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn('px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                filter === tab ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border',
              )}
            >
              {tab === 'All' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filter === 'All' ? 'No documents' : `No ${filter.toLowerCase()} documents`}
          description={filter === 'All' ? 'Upload the first document to get started.' : `No documents with ${filter.toLowerCase()} status.`}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} customerId={customerId} onPreview={setPreviewDoc} />
          ))}
        </div>
      )}
    </div>
  );
}
