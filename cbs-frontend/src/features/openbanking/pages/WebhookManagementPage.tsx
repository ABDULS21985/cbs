import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Activity,
  BellRing,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Webhook } from '../api/marketplaceApi';
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhookDeliveries,
  useRetryDelivery,
  useTestWebhook,
} from '../hooks/useMarketplace';
import { WebhookTable } from '../components/webhooks/WebhookTable';
import {
  WebhookConfigForm,
  type WebhookFormData,
} from '../components/webhooks/WebhookConfigForm';
import { WebhookDeliveryLog } from '../components/webhooks/WebhookDeliveryLog';
import { WebhookTestPanel } from '../components/webhooks/WebhookTestPanel';

// ─── Page ───────────────────────────────────────────────────────────────────

export function WebhookManagementPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<number | null>(null);

  const { data: webhooks = [], isLoading, refetch, isFetching } = useWebhooks();
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const retryDeliveryMutation = useRetryDelivery();
  const testWebhookMutation = useTestWebhook();

  const { data: deliveries = [], isLoading: deliveriesLoading } = useWebhookDeliveries(
    selectedWebhook?.id ?? 0,
  );

  const stats = useMemo(() => {
    const active = webhooks.filter((webhook) => webhook.status === 'ACTIVE').length;
    const failed = webhooks.filter((webhook) => webhook.status === 'FAILED').length;
    const disabled = webhooks.filter((webhook) => webhook.status === 'DISABLED').length;
    const avgSuccessRate =
      webhooks.length > 0
        ? webhooks.reduce((sum, webhook) => sum + webhook.successRate, 0) / webhooks.length
        : 0;

    return {
      total: webhooks.length,
      active,
      failed,
      disabled,
      avgSuccessRate,
      liveEndpoints: webhooks.filter((webhook) => Boolean(webhook.lastDeliveredAt)).length,
    };
  }, [webhooks]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleRegister = useCallback(
    async (data: WebhookFormData) => {
      try {
        await createWebhookMutation.mutateAsync({
          url: data.url,
          events: data.events,
          authType: data.authType,
          secretKey: data.secretKey,
        });
        setShowRegister(false);
        toast.success('Webhook registered successfully');
      } catch {
        toast.error('Failed to register webhook');
      }
    },
    [createWebhookMutation],
  );

  const handleToggleStatus = useCallback(
    (webhook: Webhook) => {
      updateWebhookMutation.mutate(
        {
          id: webhook.id,
          data: { status: webhook.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
        },
        {
          onSuccess: () =>
            toast.success(
              webhook.status === 'ACTIVE' ? 'Webhook disabled' : 'Webhook enabled',
            ),
          onError: () => toast.error('Failed to update webhook'),
        },
      );
    },
    [updateWebhookMutation],
  );

  const handleDelete = useCallback(
    (webhook: Webhook) => {
      deleteWebhookMutation.mutate(webhook.id, {
        onSuccess: () => {
          if (selectedWebhook?.id === webhook.id) setSelectedWebhook(null);
          toast.success('Webhook deleted');
        },
        onError: () => toast.error('Failed to delete webhook'),
      });
    },
    [deleteWebhookMutation, selectedWebhook],
  );

  const handleRetry = useCallback(
    async (deliveryId: number) => {
      if (!selectedWebhook) return;
      setRetryingDeliveryId(deliveryId);
      retryDeliveryMutation.mutate(
        { webhookId: selectedWebhook.id, deliveryId },
        {
          onSuccess: () => toast.success('Delivery retried'),
          onError: () => toast.error('Failed to retry delivery'),
          onSettled: () => setRetryingDeliveryId(null),
        },
      );
    },
    [retryDeliveryMutation, selectedWebhook],
  );

  const handleSendTest = useCallback(
    async (webhookId: number, event: string) => {
      try {
        const result = await testWebhookMutation.mutateAsync({ webhookId, event });
        return result;
      } catch {
        return {
          success: false,
          statusCode: 0,
          responseTimeMs: 0,
          message: 'Test request failed',
        };
      }
    },
    [testWebhookMutation],
  );

  // ─── Detail View ──────────────────────────────────────────────────────

  if (selectedWebhook) {
    return (
      <>
        <PageHeader
          title="Webhook Delivery Monitor"
          subtitle={`Inspect delivery health and test endpoint responsiveness for webhook #${selectedWebhook.id}.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleToggleStatus(selectedWebhook)}
                className="ob-page-action-button"
              >
                <ShieldCheck className="h-4 w-4" />
                {selectedWebhook.status === 'ACTIVE' ? 'Disable endpoint' : 'Enable endpoint'}
              </button>
              <button
                onClick={() => setSelectedWebhook(null)}
                className="ob-page-action-button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>
            </div>
          }
        />

        <div className="page-container space-y-6 pb-6 pt-6">
          <section className="ob-page-hero">
            <div className="ob-page-hero-grid">
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="ob-page-kicker">Webhook detail</p>
                  <h2 className="ob-page-title">{selectedWebhook.url}</h2>
                  <p className="ob-page-description">
                    {selectedWebhook.tppClientName ?? `TPP #${selectedWebhook.tppClientId}`} is
                    subscribed to {selectedWebhook.events.length} live event
                    {selectedWebhook.events.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="ob-page-chip-row">
                  <span className="ob-page-chip">{selectedWebhook.status}</span>
                  <span className="ob-page-chip">{selectedWebhook.authType}</span>
                  <span className="ob-page-chip">
                    {deliveriesLoading ? 'Loading deliveries' : `${deliveries.length} deliveries`}
                  </span>
                </div>
              </div>
              <div className="ob-page-hero-side grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Success rate',
                    value: `${selectedWebhook.successRate.toFixed(1)}%`,
                    description: 'Recent delivery success performance.',
                  },
                  {
                    label: 'Subscribed events',
                    value: selectedWebhook.events.length.toString(),
                    description: 'Event topics bound to this endpoint.',
                  },
                  {
                    label: 'Deliveries',
                    value: deliveriesLoading ? '...' : deliveries.length.toString(),
                    description: 'Recorded attempts on this registration.',
                  },
                  {
                    label: 'Last delivery',
                    value: selectedWebhook.lastDeliveredAt ? 'Live' : 'Pending',
                    description: selectedWebhook.lastDeliveredAt ?? 'No delivery recorded yet.',
                  },
                ].map((item) => (
                  <div key={item.label} className="ob-page-kpi-card">
                    <p className="ob-page-kpi-label">{item.label}</p>
                    <p className="ob-page-kpi-value">{item.value}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="ob-page-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Subscribed events</p>
                <p className="text-sm text-muted-foreground">
                  These event keys are currently configured on the live registration.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Delivery identity: #{selectedWebhook.id}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedWebhook.events.map((event) => (
                <span
                  key={event}
                  className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <WebhookTestPanel
                webhookId={selectedWebhook.id}
                availableEvents={selectedWebhook.events}
                onSendTest={handleSendTest}
              />
            </div>
            <div className="lg:col-span-2">
              {deliveriesLoading ? (
                <div className="ob-page-panel flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <WebhookDeliveryLog
                  deliveries={deliveries}
                  onRetry={handleRetry}
                  retryingId={retryingDeliveryId}
                />
              )}
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="ob-page-action-button disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Register Webhook
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6 pb-6 pt-6">
        <section className="ob-page-hero">
          <div className="ob-page-hero-grid">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="ob-page-kicker">Event delivery control</p>
                <h2 className="ob-page-title">Operate webhook endpoints from one surface</h2>
                <p className="ob-page-description">
                  Review endpoint health, toggle delivery posture, and drill into delivery logs
                  without leaving the live open-banking operations flow.
                </p>
              </div>
              <div className="ob-page-chip-row">
                <span className="ob-page-chip">
                  <Activity className="h-4 w-4 text-primary" />
                  {stats.active} active endpoints
                </span>
                <span className="ob-page-chip">
                  <BellRing className="h-4 w-4 text-primary" />
                  {stats.failed} failing endpoints
                </span>
                <span className="ob-page-chip">
                  <Send className="h-4 w-4 text-primary" />
                  {stats.liveEndpoints} recently delivered
                </span>
              </div>
            </div>

            <div className="ob-page-hero-side grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: 'Total webhooks',
                  value: isLoading ? '...' : stats.total.toString(),
                  description: 'Registered real-time delivery endpoints.',
                },
                {
                  label: 'Active',
                  value: isLoading ? '...' : stats.active.toString(),
                  description: 'Endpoints currently accepting deliveries.',
                },
                {
                  label: 'Disabled',
                  value: isLoading ? '...' : stats.disabled.toString(),
                  description: 'Registrations intentionally paused.',
                },
                {
                  label: 'Avg success rate',
                  value: isLoading ? '...' : `${stats.avgSuccessRate.toFixed(1)}%`,
                  description: 'Average success rate across current webhooks.',
                },
              ].map((item) => (
                <div key={item.label} className="ob-page-kpi-card">
                  <p className="ob-page-kpi-label">{item.label}</p>
                  <p className="ob-page-kpi-value">{item.value}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="ob-page-panel flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="ob-page-workspace space-y-5">
            <div className="ob-page-panel flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Webhook registry</p>
                <p className="text-sm text-muted-foreground">
                  Select any registration to inspect deliveries, replay failed events, or test the
                  endpoint against the live contract.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.total} registered endpoint{stats.total === 1 ? '' : 's'}
              </div>
            </div>
            <WebhookTable
              webhooks={webhooks}
              onSelect={setSelectedWebhook}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Register Sheet */}
      <WebhookConfigForm
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSubmit={handleRegister}
        isPending={createWebhookMutation.isPending}
      />
    </>
  );
}
