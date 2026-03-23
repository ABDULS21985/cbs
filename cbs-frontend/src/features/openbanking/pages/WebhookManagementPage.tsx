import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Webhook, WebhookDelivery } from '../api/marketplaceApi';
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

  const { data: webhooks = [], isLoading } = useWebhooks();
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const retryDeliveryMutation = useRetryDelivery();
  const testWebhookMutation = useTestWebhook();

  const { data: deliveries = [], isLoading: deliveriesLoading } = useWebhookDeliveries(
    selectedWebhook?.id ?? 0,
  );

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleRegister = useCallback(
    async (data: WebhookFormData) => {
      createWebhookMutation.mutate(
        {
          url: data.url,
          events: data.events,
          authType: data.authType,
          secretKey: data.secretKey,
        },
        {
          onSuccess: () => {
            setShowRegister(false);
            toast.success('Webhook registered successfully');
          },
          onError: () => toast.error('Failed to register webhook'),
        },
      );
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
      retryDeliveryMutation.mutate(
        { webhookId: selectedWebhook.id, deliveryId },
        {
          onSuccess: () => toast.success('Delivery retried'),
          onError: () => toast.error('Failed to retry delivery'),
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
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={cn(
                'text-sm font-semibold mt-1',
                selectedWebhook.status === 'ACTIVE' ? 'text-green-600' : selectedWebhook.status === 'FAILED' ? 'text-red-600' : 'text-muted-foreground',
              )}>
                {selectedWebhook.status}
              </p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Auth Type</p>
              <p className="text-sm font-semibold mt-1">{selectedWebhook.authType}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-sm font-semibold mt-1 tabular-nums">{selectedWebhook.successRate}%</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Events</p>
              <p className="text-sm font-semibold mt-1">{selectedWebhook.events.length}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs text-muted-foreground">Deliveries</p>
              <p className="text-sm font-semibold mt-1 tabular-nums">
                {deliveriesLoading ? '...' : deliveries.length}
              </p>
            </div>
          </div>

          {/* Events */}
          <div className="surface-card p-5">
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
              {deliveriesLoading ? (
                <div className="flex items-center justify-center py-12 surface-card">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <WebhookDeliveryLog
                  deliveries={deliveries}
                  onRetry={handleRetry}
                  retryingId={retryDeliveryMutation.isPending ? -1 : null}
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
          <div className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Total Webhooks</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {isLoading ? '...' : webhooks.length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-green-600">
              {isLoading ? '...' : webhooks.filter((w) => w.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-red-600">
              {isLoading ? '...' : webhooks.filter((w) => w.status === 'FAILED').length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-xs text-muted-foreground">Avg Success Rate</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {isLoading
                ? '...'
                : webhooks.length > 0
                  ? (webhooks.reduce((s, w) => s + w.successRate, 0) / webhooks.length).toFixed(1)
                  : '0'}
              %
            </p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 surface-card">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WebhookTable
            webhooks={webhooks}
            onSelect={setSelectedWebhook}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
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
