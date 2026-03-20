import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Webhook, WebhookDelivery } from '../api/marketplaceApi';
import { WebhookTable } from '../components/webhooks/WebhookTable';
import {
  WebhookConfigForm,
  type WebhookFormData,
} from '../components/webhooks/WebhookConfigForm';
import { WebhookDeliveryLog } from '../components/webhooks/WebhookDeliveryLog';
import { WebhookTestPanel } from '../components/webhooks/WebhookTestPanel';

// ─── Mock Data (replace with real API hooks) ────────────────────────────────

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: 1,
    url: 'https://api.fintech-app.com/webhooks/cbs',
    events: ['payment.completed', 'consent.granted', 'consent.revoked'],
    tppClientId: 1,
    tppClientName: 'FinTech App Ltd',
    authType: 'HMAC',
    status: 'ACTIVE',
    successRate: 98.5,
    lastDeliveredAt: new Date(Date.now() - 300_000).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
  },
  {
    id: 2,
    url: 'https://payments.example.io/hooks',
    events: ['payment.completed', 'transaction.created'],
    tppClientId: 2,
    tppClientName: 'PayNow Corp',
    authType: 'BEARER',
    status: 'ACTIVE',
    successRate: 99.1,
    lastDeliveredAt: new Date(Date.now() - 600_000).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000 * 15).toISOString(),
  },
  {
    id: 3,
    url: 'https://old-service.test/callback',
    events: ['account.updated'],
    tppClientId: 3,
    tppClientName: 'LegacyTPP',
    authType: 'NONE',
    status: 'FAILED',
    successRate: 45.2,
    lastDeliveredAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000 * 60).toISOString(),
  },
];

const MOCK_DELIVERIES: WebhookDelivery[] = [
  {
    id: 101,
    webhookId: 1,
    event: 'payment.completed',
    httpStatus: 200,
    durationMs: 142,
    responseBody: '{"status":"ok"}',
    status: 'SUCCESS',
    attemptCount: 1,
    deliveredAt: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: 102,
    webhookId: 1,
    event: 'consent.granted',
    httpStatus: 200,
    durationMs: 89,
    responseBody: '{"received":true}',
    status: 'SUCCESS',
    attemptCount: 1,
    deliveredAt: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    id: 103,
    webhookId: 1,
    event: 'payment.completed',
    httpStatus: 500,
    durationMs: 3012,
    responseBody: '{"error":"Internal Server Error"}',
    status: 'FAILED',
    attemptCount: 3,
    deliveredAt: new Date(Date.now() - 900_000).toISOString(),
  },
  {
    id: 104,
    webhookId: 1,
    event: 'consent.revoked',
    httpStatus: 0,
    durationMs: 30000,
    responseBody: null as unknown as string,
    status: 'TIMEOUT',
    attemptCount: 5,
    deliveredAt: new Date(Date.now() - 7_200_000).toISOString(),
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export function WebhookManagementPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
  const [showRegister, setShowRegister] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleRegister = useCallback(async (data: WebhookFormData) => {
    setRegistering(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const newWebhook: Webhook = {
        id: Date.now(),
        url: data.url,
        events: data.events,
        tppClientId: 0,
        tppClientName: 'Current Bank',
        authType: data.authType,
        secretKey: data.secretKey,
        status: 'ACTIVE',
        successRate: 100,
        createdAt: new Date().toISOString(),
      };
      setWebhooks((prev) => [newWebhook, ...prev]);
      setShowRegister(false);
      toast.success('Webhook registered successfully');
    } catch {
      toast.error('Failed to register webhook');
    } finally {
      setRegistering(false);
    }
  }, []);

  const handleToggleStatus = useCallback((webhook: Webhook) => {
    setWebhooks((prev) =>
      prev.map((w) =>
        w.id === webhook.id
          ? { ...w, status: w.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }
          : w,
      ),
    );
    toast.success(
      webhook.status === 'ACTIVE' ? 'Webhook disabled' : 'Webhook enabled',
    );
  }, []);

  const handleDelete = useCallback((webhook: Webhook) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    if (selectedWebhook?.id === webhook.id) setSelectedWebhook(null);
    toast.success('Webhook deleted');
  }, [selectedWebhook]);

  const handleRetry = useCallback(async (deliveryId: number) => {
    setRetryingId(deliveryId);
    await new Promise((r) => setTimeout(r, 1000));
    setRetryingId(null);
    toast.success('Delivery retried');
  }, []);

  const handleSendTest = useCallback(
    async (_webhookId: number, event: string) => {
      await new Promise((r) => setTimeout(r, 1200));
      const success = Math.random() > 0.2;
      return {
        success,
        statusCode: success ? 200 : 500,
        responseTimeMs: Math.round(Math.random() * 400 + 50),
        message: success ? undefined : 'Server returned an error response',
      };
    },
    [],
  );

  // ─── Detail View ──────────────────────────────────────────────────────

  if (selectedWebhook) {
    const deliveries = MOCK_DELIVERIES.filter(
      (d) => d.webhookId === selectedWebhook.id,
    );

    return (
      <>
        <PageHeader
          title={selectedWebhook.url}
          subtitle={`Webhook #${selectedWebhook.id} - ${selectedWebhook.tppClientName ?? 'Unknown TPP'}`}
          backTo="#"
          actions={
            <button
              onClick={() => setSelectedWebhook(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>
          }
        />

        <div className="page-container space-y-6">
          {/* Webhook Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={cn(
                'text-sm font-semibold mt-1',
                selectedWebhook.status === 'ACTIVE' ? 'text-green-600' : selectedWebhook.status === 'FAILED' ? 'text-red-600' : 'text-muted-foreground',
              )}>
                {selectedWebhook.status}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Auth Type</p>
              <p className="text-sm font-semibold mt-1">{selectedWebhook.authType}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-sm font-semibold mt-1 tabular-nums">{selectedWebhook.successRate}%</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Events</p>
              <p className="text-sm font-semibold mt-1">{selectedWebhook.events.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Deliveries</p>
              <p className="text-sm font-semibold mt-1 tabular-nums">{deliveries.length}</p>
            </div>
          </div>

          {/* Events */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Subscribed Events</h3>
            <div className="flex flex-wrap gap-2">
              {selectedWebhook.events.map((event) => (
                <span
                  key={event}
                  className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>

          {/* Test Panel + Delivery Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <WebhookTestPanel
                webhookId={selectedWebhook.id}
                availableEvents={selectedWebhook.events}
                onSendTest={handleSendTest}
              />
            </div>
            <div className="lg:col-span-2">
              <WebhookDeliveryLog
                deliveries={deliveries}
                onRetry={handleRetry}
                retryingId={retryingId}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Webhook Management"
        subtitle="Configure and monitor webhook endpoints for real-time event delivery."
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Webhook
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Webhooks</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{webhooks.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-green-600">
              {webhooks.filter((w) => w.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-red-600">
              {webhooks.filter((w) => w.status === 'FAILED').length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Avg Success Rate</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {webhooks.length > 0
                ? (webhooks.reduce((s, w) => s + w.successRate, 0) / webhooks.length).toFixed(1)
                : '0'}
              %
            </p>
          </div>
        </div>

        {/* Table */}
        <WebhookTable
          webhooks={webhooks}
          onSelect={setSelectedWebhook}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      </div>

      {/* Register Sheet */}
      <WebhookConfigForm
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSubmit={handleRegister}
        isPending={registering}
      />
    </>
  );
}
