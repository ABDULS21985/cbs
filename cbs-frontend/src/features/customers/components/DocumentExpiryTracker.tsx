import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CustomerDocument } from '../types/customer';

interface DocumentExpiryTrackerProps {
  documents: CustomerDocument[];
}

function daysDiff(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getDocIcon(type: string) {
  return FileText;
}

export function DocumentExpiryTracker({ documents }: DocumentExpiryTrackerProps) {
  const docsWithExpiry = documents
    .filter((d) => d.expiryDate)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  if (docsWithExpiry.length === 0) return null;

  const expired = docsWithExpiry.filter((d) => daysDiff(d.expiryDate!) < 0);
  const expiringSoon = docsWithExpiry.filter((d) => { const days = daysDiff(d.expiryDate!); return days >= 0 && days <= 30; });
  const needsAttention = expired.length + expiringSoon.length;

  if (needsAttention === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10 px-4 py-3">
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-700 dark:text-green-300 font-medium">All documents are current</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-semibold">{needsAttention} document{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention</p>
        </div>
      </div>
      <div className="divide-y">
        {docsWithExpiry.map((doc) => {
          const days = daysDiff(doc.expiryDate!);
          const isExpired = days < 0;
          const isExpiringSoon = days >= 0 && days <= 30;
          const severity = isExpired ? 'expired' : isExpiringSoon ? 'warning' : 'ok';

          const Icon = getDocIcon(doc.documentType);

          return (
            <div key={doc.id} className={cn('flex items-center gap-3 px-4 py-2.5',
              severity === 'expired' && 'bg-red-50/50 dark:bg-red-900/5',
              severity === 'warning' && 'bg-amber-50/50 dark:bg-amber-900/5',
            )}>
              <Icon className={cn('w-4 h-4 flex-shrink-0',
                severity === 'expired' ? 'text-red-500' : severity === 'warning' ? 'text-amber-500' : 'text-green-500',
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{doc.documentType?.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {doc.documentNumber ? `***${doc.documentNumber.slice(-4)}` : '—'}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(doc.expiryDate!)}</span>
              <span className={cn('text-xs font-medium whitespace-nowrap',
                severity === 'expired' ? 'text-red-600' : severity === 'warning' ? 'text-amber-600' : 'text-green-600',
              )}>
                {isExpired ? `Expired ${Math.abs(days)}d ago` : isExpiringSoon ? `${days}d left` : `Valid`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
