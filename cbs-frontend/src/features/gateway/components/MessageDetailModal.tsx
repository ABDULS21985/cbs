import { X } from 'lucide-react';
import { formatDateTime, formatMoney } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import type { GatewayMessage } from '../api/gatewayApi';

interface MessageDetailModalProps {
  message: GatewayMessage | null;
  open: boolean;
  onClose: () => void;
}

function isXml(str: string): boolean {
  return str.trimStart().startsWith('<');
}

function CodeBlock({ content }: { content: string }) {
  return (
    <pre className="rounded-md bg-muted/60 border p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto leading-relaxed">
      {content}
    </pre>
  );
}

export function MessageDetailModal({ message, open, onClose }: MessageDetailModalProps) {
  if (!open || !message) return null;

  const totalTiming = message.timingBreakdown?.reduce((s, t) => s + t.durationMs, 0) ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
            <div>
              <h2 className="text-base font-semibold">Message Detail</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{message.reference}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Reference</div>
                  <div className="text-sm font-medium font-mono">{message.reference}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Direction</div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <span className={message.direction === 'INBOUND' ? 'text-blue-500' : 'text-green-500'}>
                      {message.direction === 'INBOUND' ? '←' : '→'}
                    </span>
                    {message.direction}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium">{message.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Counterparty</div>
                  <div className="text-sm font-medium">{message.counterparty}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="text-sm font-medium">
                    {message.amount != null ? formatMoney(message.amount, message.currency ?? 'NGN') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-0.5">
                    <StatusBadge status={message.status} dot />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sent At</div>
                  <div className="text-sm">{formatDateTime(message.sentAt)}</div>
                </div>
                {message.latencyMs != null && (
                  <div>
                    <div className="text-xs text-muted-foreground">Latency</div>
                    <div className="text-sm">{message.latencyMs}ms</div>
                  </div>
                )}
                {message.attempts != null && (
                  <div>
                    <div className="text-xs text-muted-foreground">Attempts</div>
                    <div className="text-sm">{message.attempts}</div>
                  </div>
                )}
              </div>
            </section>

            {/* Error Info */}
            {message.errorCode && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Error Details</h3>
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-700 dark:text-red-400 font-mono">{message.errorCode}</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">{message.errorMessage}</p>
                </div>
              </section>
            )}

            {/* Payload */}
            {message.payload && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Payload {isXml(message.payload) ? '(XML)' : '(JSON)'}
                </h3>
                <CodeBlock content={message.payload} />
              </section>
            )}

            {/* Response */}
            {message.response && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Response {isXml(message.response) ? '(XML)' : '(JSON)'}
                </h3>
                <CodeBlock content={message.response} />
              </section>
            )}

            {/* Timing Breakdown */}
            {message.timingBreakdown && message.timingBreakdown.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Timing Breakdown</h3>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Stage</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {message.timingBreakdown.map((t) => (
                        <tr key={t.stage} className="border-b last:border-0">
                          <td className="px-4 py-2 text-sm">{t.stage}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{t.durationMs}ms</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/20 font-semibold">
                        <td className="px-4 py-2 text-sm">Total</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{totalTiming}ms</td>
                      </tr>
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
