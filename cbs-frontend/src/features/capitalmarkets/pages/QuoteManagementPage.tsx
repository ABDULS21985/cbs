import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Quote, FileText, Clock, Trash2, Plus, X, CheckCircle2, XCircle } from 'lucide-react';
import {
  useQuoteRequests,
  useSubmitQuoteRequest,
  useGenerateQuote,
  useAcceptQuote,
  useExpireStaleQuotes,
} from '../hooks/useCapitalMarketsExt';
import type { PriceQuote, QuoteRequest } from '../types/quote';
import { toast } from 'sonner';

// ── Active Quotes Tab ───────────────────────────────────────────────────────

function ActiveQuotesTab() {
  const { data: requests = [], isLoading } = useQuoteRequests({ status: 'ACTIVE' });
  const accept = useAcceptQuote();

  // Derive quotes from requests that have quotes provided
  const quotes = useMemo(() => (requests as QuoteRequest[]).filter((r) => r.quotesProvided > 0), [requests]);

  const columns = useMemo<ColumnDef<QuoteRequest, unknown>[]>(() => [
    { accessorKey: 'requestRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.requestRef}</span> },
    { accessorKey: 'instrumentType', header: 'Instrument' },
    { accessorKey: 'currencyPair', header: 'Pair' },
    { accessorKey: 'tenor', header: 'Tenor' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => formatMoney(row.original.amount) },
    { accessorKey: 'direction', header: 'Direction', cell: ({ row }) => <span className={cn('text-xs font-semibold', row.original.direction === 'BUY' ? 'text-green-600' : 'text-red-600')}>{row.original.direction}</span> },
    { accessorKey: 'quotesProvided', header: 'Quotes', cell: ({ row }) => <span className="tabular-nums">{row.original.quotesProvided}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.selectedQuoteId ? (
          <button className="btn-primary text-xs px-2 py-1 flex items-center gap-1" onClick={() => accept.mutate(row.original.selectedQuoteId, { onSuccess: () => toast.success('Quote accepted') })}><CheckCircle2 className="w-3 h-3" /> Accept</button>
        ) : null}
      </div>
    )},
  ], [accept]);

  return (
    <div className="p-4">
      <DataTable columns={columns} data={quotes} isLoading={isLoading} pageSize={15} />
    </div>
  );
}

// ── Quote Requests Tab ──────────────────────────────────────────────────────

function QuoteRequestsTab() {
  const { data: requests = [], isLoading } = useQuoteRequests();
  const generate = useGenerateQuote();
  const submit = useSubmitQuoteRequest();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ instrumentType: 'BOND', currencyPair: 'USD/NGN', tenor: '1M', amount: 0, direction: 'BUY' });

  const columns = useMemo<ColumnDef<QuoteRequest, unknown>[]>(() => [
    { accessorKey: 'requestRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.requestRef}</span> },
    { accessorKey: 'requestorName', header: 'Requestor' },
    { accessorKey: 'instrumentType', header: 'Instrument' },
    { accessorKey: 'currencyPair', header: 'Pair' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => formatMoney(row.original.amount) },
    { accessorKey: 'direction', header: 'Dir', cell: ({ row }) => <span className={cn('text-xs font-semibold', row.original.direction === 'BUY' ? 'text-green-600' : 'text-red-600')}>{row.original.direction}</span> },
    { accessorKey: 'requestedAt', header: 'Requested', cell: ({ row }) => formatDate(row.original.requestedAt) },
    { accessorKey: 'responseDeadline', header: 'Deadline', cell: ({ row }) => formatDate(row.original.responseDeadline) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'PENDING' ? (
      <button className="btn-primary text-xs px-2 py-1" onClick={() => generate.mutate({ instrumentType: row.original.instrumentType, currencyPair: row.original.currencyPair, tenor: row.original.tenor, notionalAmount: row.original.amount } as Partial<PriceQuote>, { onSuccess: () => toast.success('Quote generated') })}>Generate Quote</button>
    ) : null },
  ], [generate]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Submit Request
        </button>
      </div>
      <DataTable columns={columns} data={requests as QuoteRequest[]} isLoading={isLoading} pageSize={15} />
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-4">Submit Quote Request</h2>
            <form onSubmit={(e) => { e.preventDefault(); submit.mutate({ instrumentType: form.instrumentType, currencyPair: form.currencyPair, tenor: form.tenor, amount: form.amount, direction: form.direction } as Partial<QuoteRequest>, { onSuccess: () => { toast.success('Request submitted'); setShowForm(false); } }); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-muted-foreground">Instrument</label><select className="w-full mt-1 input" value={form.instrumentType} onChange={(e) => setForm((f) => ({ ...f, instrumentType: e.target.value }))}><option value="BOND">Bond</option><option value="FX_SPOT">FX Spot</option><option value="FX_FORWARD">FX Forward</option><option value="SWAP">Swap</option></select></div>
                <div><label className="text-sm font-medium text-muted-foreground">Direction</label><select className="w-full mt-1 input" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}><option value="BUY">BUY</option><option value="SELL">SELL</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-muted-foreground">Currency Pair</label><input className="w-full mt-1 input" value={form.currencyPair} onChange={(e) => setForm((f) => ({ ...f, currencyPair: e.target.value }))} /></div>
                <div><label className="text-sm font-medium text-muted-foreground">Tenor</label><input className="w-full mt-1 input" value={form.tenor} onChange={(e) => setForm((f) => ({ ...f, tenor: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium text-muted-foreground">Amount</label><input type="number" className="w-full mt-1 input" value={form.amount || ''} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required min={0} /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={submit.isPending} className="btn-primary">{submit.isPending ? 'Submitting...' : 'Submit'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expired Tab ─────────────────────────────────────────────────────────────

function ExpiredTab() {
  const { data: requests = [], isLoading } = useQuoteRequests({ status: 'EXPIRED' });
  const expire = useExpireStaleQuotes();

  const columns = useMemo<ColumnDef<QuoteRequest, unknown>[]>(() => [
    { accessorKey: 'requestRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.requestRef}</span> },
    { accessorKey: 'requestorName', header: 'Requestor' },
    { accessorKey: 'instrumentType', header: 'Instrument' },
    { accessorKey: 'currencyPair', header: 'Pair' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => formatMoney(row.original.amount) },
    { accessorKey: 'responseDeadline', header: 'Deadline', cell: ({ row }) => formatDate(row.original.responseDeadline) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button className="btn-secondary flex items-center gap-2" onClick={() => expire.mutate(undefined, { onSuccess: () => toast.success('Stale quotes expired') })} disabled={expire.isPending}>
          <Trash2 className="w-4 h-4" /> {expire.isPending ? 'Expiring...' : 'Expire Stale Quotes'}
        </button>
      </div>
      <DataTable columns={columns} data={requests as QuoteRequest[]} isLoading={isLoading} pageSize={15} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function QuoteManagementPage() {
  useEffect(() => { document.title = 'Quote Management | CBS'; }, []);

  const { data: requests = [] } = useQuoteRequests();
  const allReqs = requests as QuoteRequest[];
  const active = allReqs.filter((r) => r.status === 'ACTIVE' || r.quotesProvided > 0);
  const pending = allReqs.filter((r) => r.status === 'PENDING');
  const expired = allReqs.filter((r) => r.status === 'EXPIRED');

  return (
    <>
      <PageHeader title="Quote Management" subtitle="RFQ workflow, pricing and quote lifecycle" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Quotes" value={active.length} format="number" icon={Quote} />
          <StatCard label="Pending Requests" value={pending.length} format="number" icon={FileText} />
          <StatCard label="Expired" value={expired.length} format="number" icon={Clock} />
          <StatCard label="Total Requests" value={allReqs.length} format="number" icon={FileText} />
        </div>
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'active', label: 'Active Quotes', badge: active.length || undefined, content: <ActiveQuotesTab /> },
            { id: 'requests', label: 'Quote Requests', badge: pending.length || undefined, content: <QuoteRequestsTab /> },
            { id: 'expired', label: 'Expired', badge: expired.length || undefined, content: <ExpiredTab /> },
          ]} />
        </div>
      </div>
    </>
  );
}
