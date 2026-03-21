import { X } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import type { AuditEntry } from '../../api/auditApi';

interface Props {
  entry: AuditEntry;
  onClose: () => void;
}

export function AuditDetailPanel({ entry, onClose }: Props) {
  const changedFields = entry.changedFields ?? [];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-card border-l shadow-xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Audit Detail</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs text-muted-foreground">Action</span><p className="font-semibold">{entry.action}</p></div>
          <div><span className="text-xs text-muted-foreground">Entity</span><p>{entry.entityType} #{entry.entityId}</p></div>
          <div><span className="text-xs text-muted-foreground">Performed By</span><p>{entry.performedBy}</p></div>
          <div><span className="text-xs text-muted-foreground">Timestamp</span><p className="font-mono text-xs">{formatDateTime(entry.eventTimestamp)}</p></div>
          <div><span className="text-xs text-muted-foreground">IP Address</span><p className="font-mono text-xs">{entry.performedFromIp ?? '—'}</p></div>
          <div><span className="text-xs text-muted-foreground">Session</span><p className="font-mono text-xs">{entry.sessionId ?? '—'}</p></div>
        </div>

        {entry.description && (
          <div>
            <span className="text-xs text-muted-foreground">Description</span>
            <p className="text-sm mt-0.5">{entry.description}</p>
          </div>
        )}

        {changedFields.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground font-medium">Changes</span>
            <table className="w-full mt-2 text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-2 text-muted-foreground">Field</th>
                  <th className="text-left py-1.5 px-2 text-muted-foreground">Before</th>
                  <th className="text-left py-1.5 px-2 text-muted-foreground">After</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {changedFields.map((field, i) => {
                  const before = entry.beforeState?.[field];
                  const after = entry.afterState?.[field];
                  return (
                    <tr key={i}>
                      <td className="py-1.5 px-2 font-mono font-medium">{field}</td>
                      <td className="py-1.5 px-2 font-mono text-red-600/70">
                        {before != null ? String(before) : <span className="text-muted-foreground italic">null</span>}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-green-600">
                        {after != null ? String(after) : <span className="text-muted-foreground italic">null</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground font-medium">Metadata</span>
            <pre className="mt-1 text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
