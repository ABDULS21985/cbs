import { useState } from 'react';
import { FileText, ExternalLink, Check, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { CustomerIdentification } from '../types/customer';

const DOC_ICONS: Record<string, string> = {
  NATIONAL_ID: '🆔', NIN: '🆔', PASSPORT: '🛂', DRIVERS_LICENSE: '🚗',
  VOTER_ID: '🗳️', BVN: '🏦', TIN: '📋', CAC: '🏢',
};

interface DocumentVerificationCardProps {
  doc: CustomerIdentification;
  onVerify: (docId: number) => void;
  onReject: (docId: number, reason: string) => void;
  isLoading?: boolean;
}

export function DocumentVerificationCard({ doc, onVerify, onReject, isLoading }: DocumentVerificationCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isExpired = doc.expired || (doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false);
  const isVerified = doc.isVerified;
  const status = isExpired ? 'EXPIRED' : isVerified ? 'VERIFIED' : 'PENDING';
  const last4 = doc.idNumber.length > 4 ? '****' + doc.idNumber.slice(-4) : doc.idNumber;

  const borderColor = isVerified ? 'border-green-300 dark:border-green-800' : isExpired ? 'border-red-300 dark:border-red-800' : 'border-amber-300 dark:border-amber-800';

  return (
    <div className={cn('rounded-xl border-2 bg-card p-4 space-y-3 transition-colors', borderColor)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{DOC_ICONS[doc.idType] ?? '📄'}</span>
          <div>
            <p className="text-sm font-semibold">{doc.idType?.replace(/_/g, ' ')}</p>
            <p className="text-xs font-mono text-muted-foreground">{last4}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {doc.issueDate && <div><span className="text-muted-foreground">Issued:</span> {formatDate(doc.issueDate)}</div>}
        <div>
          <span className="text-muted-foreground">Expires:</span>{' '}
          <span className={isExpired ? 'text-red-600 font-medium' : ''}>
            {doc.expiryDate ? formatDate(doc.expiryDate) : 'N/A'}
          </span>
        </div>
        {doc.issuingAuthority && <div><span className="text-muted-foreground">Authority:</span> {doc.issuingAuthority}</div>}
        {doc.issuingCountry && <div><span className="text-muted-foreground">Country:</span> {doc.issuingCountry}</div>}
      </div>

      {doc.documentUrl && (
        <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> View Document
        </a>
      )}

      {!isVerified && !showRejectInput && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onVerify(doc.id)} disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
            <Check className="w-3 h-3" /> Verify
          </button>
          <button onClick={() => setShowRejectInput(true)} disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
            <X className="w-3 h-3" /> Reject
          </button>
        </div>
      )}

      {showRejectInput && (
        <div className="space-y-2 pt-1">
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..."
            className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectInput(false)} className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">Cancel</button>
            <button onClick={() => { onReject(doc.id, rejectReason); setShowRejectInput(false); }} disabled={!rejectReason}
              className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">Confirm Reject</button>
          </div>
        </div>
      )}

      {isVerified && doc.verifiedAt && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <Shield className="w-3 h-3" /> Verified on {formatDate(doc.verifiedAt)}
        </div>
      )}
    </div>
  );
}
