import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { CheckCircle2, AlertTriangle, Clock, BarChart3, Plus, X, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradeOpsApi, type TradeConfirmation } from '../api/tradeOpsApi';
import { ConfirmationTable } from '../components/tradeops/ConfirmationTable';
import { ConfirmationMatchPanel } from '../components/tradeops/ConfirmationMatchPanel';
import { AllocationForm } from '../components/tradeops/AllocationForm';
import { ClearingQueue } from '../components/tradeops/ClearingQueue';
import { TradeReportTable } from '../components/tradeops/TradeReportTable';
import { UnmatchedTrades } from '../components/tradeops/UnmatchedTrades';
import { toast } from 'sonner';

const KEYS = {
  confirmations: (params?: Record<string, string>) => ['trade-ops', 'confirmations', params],
  unmatched: () => ['trade-ops', 'unmatched'],
  allocations: () => ['trade-ops', 'allocations'],
  clearing: () => ['trade-ops', 'clearing'],
  pendingClearing: () => ['trade-ops', 'clearing', 'pending'],
  reports: () => ['trade-ops', 'reports'],
};

// ── New Confirmation Form ────────────────────────────────────────────────────

function NewConfirmationForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: tradeOpsApi.submitConfirmation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade-ops'] });
      toast.success('Confirmation submitted');
      onClose();
    },
  });

  const [form, setForm] = useState({
    tradeDate: new Date().toISOString().split('T')[0],
    instrumentCode: '',
    counterpartyCode: '',
    side: 'BUY' as 'BUY' | 'SELL',
    quantity: 0,
    price: 0,
    currency: 'NGN',
    settlementDate: '',
  });

  const update = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Submit Trade Confirmation</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(form);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Trade Date</label>
              <input type="date" className="w-full mt-1 input" value={form.tradeDate} onChange={(e) => update('tradeDate', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Settlement Date</label>
              <input type="date" className="w-full mt-1 input" value={form.settlementDate} onChange={(e) => update('settlementDate', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Instrument Code</label>
            <input className="w-full mt-1 input" placeholder="e.g., DANGCEM" value={form.instrumentCode} onChange={(e) => update('instrumentCode', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Counterparty Code</label>
            <input className="w-full mt-1 input" placeholder="e.g., CPTY-001" value={form.counterpartyCode} onChange={(e) => update('counterpartyCode', e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Side</label>
              <select className="w-full mt-1 input" value={form.side} onChange={(e) => update('side', e.target.value)}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <input type="number" className="w-full mt-1 input" value={form.quantity || ''} onChange={(e) => update('quantity', parseInt(e.target.value) || 0)} required min={1} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Price</label>
              <input type="number" step="0.01" className="w-full mt-1 input" value={form.price || ''} onChange={(e) => update('price', parseFloat(e.target.value) || 0)} required min={0} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Currency</label>
            <select className="w-full mt-1 input" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
              {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submit.isPending} className="btn-primary">
              {submit.isPending ? 'Submitting...' : 'Submit Confirmation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Report Form ──────────────────────────────────────────────────────────

function NewReportForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: tradeOpsApi.submitTradeReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.reports() });
      toast.success('Report submitted');
      onClose();
    },
  });
  const [form, setForm] = useState({ reportType: 'DAILY_TRADE', reportDate: new Date().toISOString().split('T')[0], tradeRefs: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Submit Trade Report</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({
              reportType: form.reportType,
              reportDate: form.reportDate,
              tradeRefs: form.tradeRefs.split(',').map((r) => r.trim()).filter(Boolean),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-muted-foreground">Report Type</label>
            <select className="w-full mt-1 input" value={form.reportType} onChange={(e) => setForm((f) => ({ ...f, reportType: e.target.value }))}>
              <option value="DAILY_TRADE">Daily Trade Report</option>
              <option value="TRANSACTION_REPORTING">Transaction Reporting</option>
              <option value="BEST_EXECUTION">Best Execution</option>
              <option value="SHORT_SELLING">Short Selling Report</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Report Date</label>
            <input type="date" className="w-full mt-1 input" value={form.reportDate} onChange={(e) => setForm((f) => ({ ...f, reportDate: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Trade References (comma-separated)</label>
            <input className="w-full mt-1 input" placeholder="TRD-001, TRD-002" value={form.tradeRefs} onChange={(e) => setForm((f) => ({ ...f, tradeRefs: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submit.isPending} className="btn-primary">
              {submit.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirmations Tab ────────────────────────────────────────────────────────

function ConfirmationsTab() {
  const [showForm, setShowForm] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.confirmations(),
    queryFn: () => tradeOpsApi.getConfirmations(),
    staleTime: 30_000,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-primary">
          <Plus className="w-4 h-4" /> Submit Confirmation
        </button>
      </div>
      <ConfirmationTable data={data} isLoading={isLoading} />
      {showForm && <NewConfirmationForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ── Matching Tab ─────────────────────────────────────────────────────────────

function MatchingTab() {
  const qc = useQueryClient();
  const { data: confirmations = [], isLoading: confLoading } = useQuery({
    queryKey: KEYS.confirmations(),
    queryFn: () => tradeOpsApi.getConfirmations(),
    staleTime: 30_000,
  });
  const { data: unmatched = [], isLoading: unmLoading } = useQuery({
    queryKey: KEYS.unmatched(),
    queryFn: () => tradeOpsApi.getUnmatchedConfirmations(),
    staleTime: 30_000,
  });

  const matchMutation = useMutation({
    mutationFn: ({ ourRef, theirRef }: { ourRef: string; theirRef: string }) =>
      tradeOpsApi.matchConfirmations(ourRef, theirRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade-ops'] });
      toast.success('Confirmations matched');
    },
  });

  const ourUnmatched = confirmations.filter((c) => c.matchStatus === 'UNMATCHED');
  const alleged = unmatched.filter((c) => c.matchStatus === 'ALLEGED' || c.matchStatus === 'UNMATCHED');

  return (
    <div className="p-4 space-y-4">
      <UnmatchedTrades trades={ourUnmatched} isLoading={confLoading} />
      <ConfirmationMatchPanel
        ourConfirmations={ourUnmatched}
        allegedConfirmations={alleged}
        isLoading={confLoading || unmLoading}
        onMatch={(ourRef, theirRef) => matchMutation.mutate({ ourRef, theirRef })}
        isMatching={matchMutation.isPending}
      />
    </div>
  );
}

// ── Allocations Tab ──────────────────────────────────────────────────────────

function AllocationsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.allocations(),
    queryFn: () => tradeOpsApi.getAllocations(),
    staleTime: 30_000,
  });

  const allocMutation = useMutation({
    mutationFn: ({ parentOrderRef, allocations }: { parentOrderRef: string; allocations: { subAccount: string; quantity: number; price: number }[] }) =>
      tradeOpsApi.submitAllocation({ parentOrderRef, allocations }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.allocations() });
      toast.success('Allocation submitted');
      setShowForm(false);
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-primary">
          <Plus className="w-4 h-4" /> Allocate
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Alloc Ref</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Parent Order</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sub-Account</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Instrument</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-8 bg-muted animate-pulse rounded mx-auto w-32" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No allocations</td></tr>
            ) : (
              data.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{a.allocationRef}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.parentOrderRef}</td>
                  <td className="px-4 py-3 text-sm font-medium">{a.subAccountName || a.subAccount}</td>
                  <td className="px-4 py-3 text-sm">{a.instrumentCode}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{a.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">{formatMoney(a.amount, a.currency)}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted">{a.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AllocationForm
          onSubmit={(parentOrderRef, allocations) => allocMutation.mutate({ parentOrderRef, allocations })}
          isPending={allocMutation.isPending}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Clearing Tab ─────────────────────────────────────────────────────────────

function ClearingTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.clearing(),
    queryFn: () => tradeOpsApi.getClearingQueue(),
    staleTime: 30_000,
  });

  const submitClearing = useMutation({
    mutationFn: (entry: { tradeRef: string; clearingHouse: string; priority: string }) =>
      tradeOpsApi.submitForClearing(entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade-ops', 'clearing'] });
      toast.success('Submitted for clearing');
    },
  });

  return (
    <div className="p-4">
      <ClearingQueue
        data={data}
        isLoading={isLoading}
        onSubmitForClearing={(entry) =>
          submitClearing.mutate({ tradeRef: entry.tradeRef, clearingHouse: entry.clearingHouse, priority: entry.priority })
        }
      />
    </div>
  );
}

// ── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const [showForm, setShowForm] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.reports(),
    queryFn: () => tradeOpsApi.getTradeReports(),
    staleTime: 60_000,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-primary">
          <Send className="w-4 h-4" /> Submit Report
        </button>
      </div>
      <TradeReportTable data={data} isLoading={isLoading} />
      {showForm && <NewReportForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TradeOpsPage() {
  const { data: confirmations = [] } = useQuery({
    queryKey: KEYS.confirmations(),
    queryFn: () => tradeOpsApi.getConfirmations(),
    staleTime: 30_000,
  });
  const { data: unmatched = [] } = useQuery({
    queryKey: KEYS.unmatched(),
    queryFn: () => tradeOpsApi.getUnmatchedConfirmations(),
    staleTime: 30_000,
  });
  const { data: pending = [] } = useQuery({
    queryKey: KEYS.pendingClearing(),
    queryFn: () => tradeOpsApi.getPendingClearing(),
    staleTime: 30_000,
  });
  const { data: allocations = [] } = useQuery({
    queryKey: KEYS.allocations(),
    queryFn: () => tradeOpsApi.getAllocations(),
    staleTime: 30_000,
  });

  const today = new Date().toISOString().split('T')[0];
  const todayConfirmations = confirmations.filter((c) => c.tradeDate === today);
  const todayAllocations = allocations.filter((a) => a.allocatedAt?.startsWith(today));

  return (
    <>
      <PageHeader
        title="Trade Operations"
        subtitle="Trade confirmation, matching, allocation, clearing, and regulatory reporting"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Confirmations Today" value={todayConfirmations.length} format="number" icon={CheckCircle2} />
          <StatCard label="Unmatched" value={unmatched.length} format="number" icon={AlertTriangle} />
          <StatCard label="Pending Clearing" value={pending.length} format="number" icon={Clock} />
          <StatCard label="Allocated Today" value={todayAllocations.length} format="number" icon={BarChart3} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              {
                id: 'confirmations',
                label: 'Confirmations',
                badge: todayConfirmations.length || undefined,
                content: <ConfirmationsTab />,
              },
              {
                id: 'matching',
                label: 'Matching',
                badge: unmatched.length || undefined,
                content: <MatchingTab />,
              },
              { id: 'allocations', label: 'Allocations', content: <AllocationsTab /> },
              {
                id: 'clearing',
                label: 'Clearing',
                badge: pending.length || undefined,
                content: <ClearingTab />,
              },
              { id: 'reports', label: 'Reports', content: <ReportsTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
