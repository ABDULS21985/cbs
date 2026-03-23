import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TestResult {
  success: boolean;
  statusCode: number;
  responseTimeMs: number;
  message?: string;
}

interface WebhookTestPanelProps {
  webhookId: number;
  availableEvents: string[];
  onSendTest: (webhookId: number, event: string) => Promise<TestResult>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhookTestPanel({
  webhookId,
  availableEvents,
  onSendTest,
}: WebhookTestPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState(availableEvents[0] || '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleSendTest = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event type');
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await onSendTest(webhookId, selectedEvent);
      setResult(res);
      if (res.success) {
        toast.success('Test webhook delivered successfully');
      } else {
        toast.error(`Test failed with status ${res.statusCode}`);
      }
    } catch {
      setResult({
        success: false,
        statusCode: 0,
        responseTimeMs: 0,
        message: 'Network error - could not reach endpoint',
      });
      toast.error('Failed to send test webhook');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Test Webhook</h3>

      <div className="space-y-4">
        {/* Event Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Event Type
          </label>
          <select
            className={inputCls}
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setResult(null);
            }}
          >
            {availableEvents.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendTest}
          disabled={sending || !selectedEvent}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 w-full justify-center"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Test
        </button>

        {/* Result */}
        {result && (
          <div
            className={cn(
              'rounded-lg border p-4 space-y-2',
              result.success
                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
            )}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
                )}
              >
                {result.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Status Code</span>
                <p className="font-mono font-medium mt-0.5">
                  {result.statusCode || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Response Time</span>
                <p className="font-mono font-medium mt-0.5">
                  {result.responseTimeMs > 0 ? `${result.responseTimeMs} ms` : 'N/A'}
                </p>
              </div>
            </div>
            {result.message && (
              <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
