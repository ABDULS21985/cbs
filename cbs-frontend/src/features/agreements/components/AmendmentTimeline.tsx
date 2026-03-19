import { FileText } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import type { Amendment } from '../api/agreementApi';

interface Props {
  amendments: Amendment[];
}

export function AmendmentTimeline({ amendments }: Props) {
  if (!amendments.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No amendments recorded</p>;
  }

  return (
    <div className="space-y-4">
      {amendments.map((amendment, idx) => (
        <div key={amendment.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            {idx < amendments.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium">{amendment.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              v{amendment.previousVersion} → v{amendment.newVersion} &middot; {amendment.changedBy} &middot; {formatDateTime(amendment.changedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
