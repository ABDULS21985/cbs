import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
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

  return (
    <div className="ob-page-panel space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Test Webhook</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a controlled sample event to validate endpoint reachability and auth posture.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Event Type
          </label>
          <select
            className="ob-page-input"
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

        <button
          onClick={handleSendTest}
          disabled={sending || !selectedEvent}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Test
        </button>

        {result && (
          <div
            className={cn(
              'space-y-3 rounded-[1.15rem] border p-4',
              result.success
                ? 'border-green-200 bg-green-50/80 dark:border-green-800 dark:bg-green-900/10'
                : 'border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-900/10',
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
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-background/40">
                <span className="text-muted-foreground">Status Code</span>
                <p className="mt-1 font-mono font-medium text-foreground">
                  {result.statusCode || 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-background/40">
                <span className="text-muted-foreground">Response Time</span>
                <p className="mt-1 font-mono font-medium text-foreground">
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
