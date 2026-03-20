import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Radio, Plus, RefreshCw, Loader2, X, AlertTriangle, Play,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useEventSubscriptions, useCreateEventSubscription, usePublishEvent,
  useProcessOutbox, useEventReplay,
} from '../hooks/useGatewayData';
import type { EventSubscription } from '../types/event';

const EVENT_TYPES = [
  'CUSTOMER_CREATED', 'ACCOUNT_OPENED', 'TRANSACTION_COMPLETED', 'LOAN_DISBURSED',
  'CARD_ISSUED', 'PAYMENT_PROCESSED', 'CONSENT_GRANTED', 'ALERT_TRIGGERED',
];

export function DomainEventsPage() {
  useEffect(() => { document.title = 'Domain Events | CBS'; }, []);
  const [showCreateSub, setShowCreateSub] = useState(false);

  const { data: subscriptions = [], isLoading } = useEventSubscriptions();
  const createSub = useCreateEventSubscription();
  const publishEvent = usePublishEvent();
  const processOutbox = useProcessOutbox();
  const eventReplay = useEventReplay();

  // Create subscription form
  const [subForm, setSubForm] = useState({ eventType: 'CUSTOMER_CREATED', subscriberName: '', webhookUrl: '', maxRetries: 3, backoffMs: 1000 });

  // Publish event form
  const [pubForm, setPubForm] = useState({ eventType: 'CUSTOMER_CREATED', aggregateType: 'CUSTOMER', aggregateId: '', payload: '{}', metadata: '{}' });

  // Replay form
  const [replayForm, setReplayForm] = useState({ eventType: 'CUSTOMER_CREATED', fromDate: '', toDate: '' });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  const subColumns = useMemo<ColumnDef<EventSubscription, unknown>[]>(() => [
    { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span> },
    { accessorKey: 'eventTypes', header: 'Event Types', cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">{(row.original.eventTypes ?? []).map(t => <span key={t} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>)}</div>
    )},
    { accessorKey: 'subscriptionName', header: 'Subscriber' },
    { accessorKey: 'deliveryUrl', header: 'Webhook', cell: ({ row }) => <span className="font-mono text-xs truncate max-w-[200px] block">{row.original.deliveryUrl}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        row.original.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600')}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </span>
    )},
    { accessorKey: 'failureCount', header: 'Failures', cell: ({ row }) => (
      <span className={cn('font-mono text-xs', (row.original.failureCount ?? 0) > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>{row.original.failureCount ?? 0}</span>
    )},
    { accessorKey: 'maxRetries', header: 'Max Retries' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.createdAt)}</span> },
  ], []);

  return (
    <>
      <PageHeader title="Domain Events & Subscriptions" backTo="/operations/gateway"
        actions={
          <div className="flex gap-2">
            <button onClick={() => processOutbox.mutate(undefined as never, { onSuccess: () => toast.success('Outbox processed') })}
              disabled={processOutbox.isPending}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
              {processOutbox.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Process Outbox
            </button>
            <button onClick={() => setShowCreateSub(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> New Subscription
            </button>
          </div>
        }
      />

      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'subscriptions', label: 'Event Subscriptions', content: (
            <div className="p-4">
              <DataTable columns={subColumns} data={Array.isArray(subscriptions) ? subscriptions : []} isLoading={isLoading}
                enableGlobalFilter enableExport exportFilename="event-subscriptions" emptyMessage="No event subscriptions configured" />
            </div>
          )},

          { id: 'replay', label: 'Event Replay', content: (
            <div className="p-6 max-w-lg space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">This will re-deliver events to all active subscribers for the selected type and period.</p>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Event Type</label>
                <select value={replayForm.eventType} onChange={e => setReplayForm(p => ({ ...p, eventType: e.target.value }))} className={fc}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">From Date</label>
                  <input type="date" value={replayForm.fromDate} onChange={e => setReplayForm(p => ({ ...p, fromDate: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">To Date</label>
                  <input type="date" value={replayForm.toDate} onChange={e => setReplayForm(p => ({ ...p, toDate: e.target.value }))} className={fc} /></div>
              </div>
              <button onClick={() => eventReplay.mutate(replayForm as never, { onSuccess: () => toast.success('Replay initiated') })}
                disabled={!replayForm.fromDate || eventReplay.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                {eventReplay.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Replay Events
              </button>
            </div>
          )},

          { id: 'publish', label: 'Publish Event', content: (
            <div className="p-6 max-w-lg space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Event Type</label>
                  <select value={pubForm.eventType} onChange={e => setPubForm(p => ({ ...p, eventType: e.target.value }))} className={fc}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Aggregate Type</label>
                  <input value={pubForm.aggregateType} onChange={e => setPubForm(p => ({ ...p, aggregateType: e.target.value }))} className={fc} /></div>
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Aggregate ID</label>
                <input value={pubForm.aggregateId} onChange={e => setPubForm(p => ({ ...p, aggregateId: e.target.value }))} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Payload (JSON)</label>
                <textarea value={pubForm.payload} onChange={e => setPubForm(p => ({ ...p, payload: e.target.value }))} rows={4} className={cn(fc, 'font-mono text-xs')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Metadata (JSON)</label>
                <textarea value={pubForm.metadata} onChange={e => setPubForm(p => ({ ...p, metadata: e.target.value }))} rows={2} className={cn(fc, 'font-mono text-xs')} /></div>
              <button onClick={() => {
                try {
                  publishEvent.mutate({ eventType: pubForm.eventType, aggregateType: pubForm.aggregateType, aggregateId: Number(pubForm.aggregateId) || 0, payload: JSON.parse(pubForm.payload), metadata: JSON.parse(pubForm.metadata) } as never, { onSuccess: () => toast.success('Event published') });
                } catch { toast.error('Invalid JSON'); }
              }} disabled={publishEvent.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {publishEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} Publish Event
              </button>
            </div>
          )},
        ]} />
      </div>

      {/* Create Subscription Dialog */}
      {showCreateSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateSub(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Create Event Subscription</h3><button onClick={() => setShowCreateSub(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Event Type *</label>
              <select value={subForm.eventType} onChange={e => setSubForm(p => ({ ...p, eventType: e.target.value }))} className={fc}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Subscriber Name *</label>
              <input value={subForm.subscriberName} onChange={e => setSubForm(p => ({ ...p, subscriberName: e.target.value }))} className={fc} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Webhook URL * (HTTPS)</label>
              <input value={subForm.webhookUrl} onChange={e => setSubForm(p => ({ ...p, webhookUrl: e.target.value }))} placeholder="https://" className={cn(fc, 'font-mono')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Max Retries</label>
                <input type="number" value={subForm.maxRetries} onChange={e => setSubForm(p => ({ ...p, maxRetries: Number(e.target.value) }))} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Backoff (ms)</label>
                <input type="number" value={subForm.backoffMs} onChange={e => setSubForm(p => ({ ...p, backoffMs: Number(e.target.value) }))} className={fc} /></div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowCreateSub(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => createSub.mutate({ subscriptionName: subForm.subscriberName, eventTypes: [subForm.eventType], deliveryUrl: subForm.webhookUrl, maxRetries: subForm.maxRetries } as never, {
                onSuccess: () => { toast.success('Subscription created'); setShowCreateSub(false); },
              })} disabled={!subForm.subscriberName || !subForm.webhookUrl || createSub.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {createSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
