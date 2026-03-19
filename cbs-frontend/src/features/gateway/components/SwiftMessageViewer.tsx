import { X } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import type { SwiftMessage } from '../api/gatewayApi';

interface SwiftMessageViewerProps {
  message: SwiftMessage | null;
  open: boolean;
  onClose: () => void;
}

export function SwiftMessageViewer({ message, open, onClose }: SwiftMessageViewerProps) {
  if (!open || !message) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">SWIFT {message.type}</h2>
                <span className="inline-flex items-center rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 text-xs font-medium font-mono">
                  {message.type}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{message.reference}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header Section */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Message Header</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Reference</div>
                  <div className="text-sm font-medium font-mono">{message.reference}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium">{message.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-0.5">
                    <StatusBadge status={message.status} dot />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sender BIC</div>
                  <div className="text-sm font-medium font-mono">{message.senderBic}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Receiver BIC</div>
                  <div className="text-sm font-medium font-mono">{message.receiverBic}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sent At</div>
                  <div className="text-sm">{formatDateTime(message.sentAt)}</div>
                </div>
              </div>
            </section>

            {/* Fields Table */}
            {message.fields && message.fields.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Message Fields</h3>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">Tag</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-52">Field Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {message.fields.map((field, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-purple-700 dark:text-purple-400 font-semibold align-top whitespace-nowrap">
                            {field.tag}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground align-top">
                            {field.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs align-top whitespace-pre-wrap break-all">
                            {field.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
