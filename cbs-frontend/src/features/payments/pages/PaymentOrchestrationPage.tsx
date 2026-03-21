import { useState, useEffect } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GitBranch, Route, Shield, Activity, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/formatters';
import { usePaymentRails, usePaymentRoutingRules, useCreatePaymentRail, useCreateRoutingRule } from '../hooks/usePaymentsExt';
import type { PaymentRail, PaymentRoutingRule } from '../types/paymentExt';

export function PaymentOrchestrationPage() {
  useEffect(() => { document.title = 'Payment Orchestration | CBS'; }, []);
  const [tab, setTab] = useState<'rails' | 'rules'>('rails');
  const [showNewRail, setShowNewRail] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);

  const { data: rails = [], isLoading: railsLoading, isError: railsError, refetch: refetchRails } = usePaymentRails();
  const { data: rules = [], isLoading: rulesLoading } = usePaymentRoutingRules();

  const createRailMutation = useCreatePaymentRail();
  const createRuleMutation = useCreateRoutingRule();

  const railColumns: ColumnDef<PaymentRail, unknown>[] = [
    { accessorKey: 'railCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.railCode}</span> },
    { accessorKey: 'railName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.railName}</span> },
    { accessorKey: 'railType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.railType} /> },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'supportedCurrencies', header: 'Currencies', cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">{(row.original.supportedCurrencies ?? []).slice(0, 3).map((c) => <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted">{c}</span>)}{(row.original.supportedCurrencies?.length ?? 0) > 3 && <span className="text-xs text-muted-foreground">+{row.original.supportedCurrencies!.length - 3}</span>}</div>
    )},
    { accessorKey: 'settlementSpeed', header: 'Speed', cell: ({ row }) => <StatusBadge status={row.original.settlementSpeed} /> },
    { accessorKey: 'flatFee', header: 'Flat Fee' },
    { accessorKey: 'percentageFee', header: 'Fee %', cell: ({ row }) => `${row.original.percentageFee}%` },
    { accessorKey: 'uptimePct', header: 'Uptime', cell: ({ row }) => <span className={row.original.uptimePct >= 99 ? 'text-green-600' : row.original.uptimePct >= 95 ? 'text-amber-600' : 'text-red-600'}>{row.original.uptimePct}%</span> },
    { accessorKey: 'isAvailable', header: 'Available', cell: ({ row }) => row.original.isAvailable ? <span className="text-green-600">●</span> : <span className="text-red-600">●</span> },
    { accessorKey: 'priorityRank', header: 'Priority' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ];

  const ruleColumns: ColumnDef<PaymentRoutingRule, unknown>[] = [
    { accessorKey: 'ruleName', header: 'Rule', cell: ({ row }) => <span className="font-medium">{row.original.ruleName}</span> },
    { accessorKey: 'rulePriority', header: 'Priority' },
    { accessorKey: 'sourceCountry', header: 'Source' },
    { accessorKey: 'destinationCountry', header: 'Destination' },
    { accessorKey: 'currencyCode', header: 'Currency' },
    { accessorKey: 'paymentType', header: 'Payment Type' },
    { accessorKey: 'channel', header: 'Channel' },
    { accessorKey: 'customerSegment', header: 'Segment' },
    { accessorKey: 'preferredRailCode', header: 'Preferred Rail', cell: ({ row }) => <span className="font-mono text-xs">{row.original.preferredRailCode}</span> },
    { accessorKey: 'fallbackRailCode', header: 'Fallback', cell: ({ row }) => <span className="font-mono text-xs">{row.original.fallbackRailCode || '—'}</span> },
    { accessorKey: 'optimizeFor', header: 'Optimize For', cell: ({ row }) => <StatusBadge status={row.original.optimizeFor} /> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ];

  const activeRails = rails.filter((r) => r.isActive && r.isAvailable).length;
  const activeRules = rules.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title="Payment Orchestration"
        subtitle="Multi-rail payment routing — rails, rules, and intelligent routing decisions"
        actions={
          <div className="flex gap-2">
            {tab === 'rails' && <Button onClick={() => setShowNewRail(true)}><Plus className="w-4 h-4 mr-1" /> New Rail</Button>}
            {tab === 'rules' && <Button onClick={() => setShowNewRule(true)}><Plus className="w-4 h-4 mr-1" /> New Rule</Button>}
          </div>
        }
      />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Payment Rails" value={rails.length} format="number" icon={GitBranch} loading={railsLoading} />
          <StatCard label="Active & Available" value={activeRails} format="number" icon={Activity} loading={railsLoading} />
          <StatCard label="Routing Rules" value={rules.length} format="number" icon={Route} loading={rulesLoading} />
          <StatCard label="Active Rules" value={activeRules} format="number" icon={Shield} loading={rulesLoading} />
        </div>

        {railsError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm text-red-700 dark:text-red-400">Failed to load orchestration data.</p></div>
            <button onClick={() => refetchRails()} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
          </div>
        )}

        <div className="flex gap-1 border-b">
          {[{ key: 'rails' as const, label: 'Payment Rails' }, { key: 'rules' as const, label: 'Routing Rules' }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'rails' && (
          <DataTable columns={railColumns} data={rails} isLoading={railsLoading} enableGlobalFilter searchPlaceholder="Search rails..." emptyMessage="No payment rails configured" />
        )}

        {tab === 'rules' && (
          <DataTable columns={ruleColumns} data={rules} isLoading={rulesLoading} enableGlobalFilter searchPlaceholder="Search rules..." emptyMessage="No routing rules configured" />
        )}
      </div>

      {/* New Rail Dialog */}
      {showNewRail && <CreateRailDialog open onClose={() => setShowNewRail(false)} onSubmit={(d) => createRailMutation.mutate(d, { onSuccess: () => { toast.success('Rail created'); setShowNewRail(false); }, onError: () => toast.error('Failed to create rail') })} isSubmitting={createRailMutation.isPending} />}

      {/* New Rule Dialog */}
      {showNewRule && <CreateRuleDialog open onClose={() => setShowNewRule(false)} rails={rails} onSubmit={(d) => createRuleMutation.mutate(d, { onSuccess: () => { toast.success('Rule created'); setShowNewRule(false); }, onError: () => toast.error('Failed to create rule') })} isSubmitting={createRuleMutation.isPending} />}
    </>
  );
}

function CreateRailDialog({ open, onClose, onSubmit, isSubmitting }: { open: boolean; onClose: () => void; onSubmit: (d: Partial<PaymentRail>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ railCode: '', railName: '', railType: 'DOMESTIC', provider: '', settlementSpeed: 'INSTANT', flatFee: 0, percentageFee: 0, feeCurrency: 'NGN', operatingHours: '24/7', priorityRank: 1 });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Payment Rail</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rail Code *</Label><Input value={form.railCode} onChange={(e) => set('railCode', e.target.value.toUpperCase())} placeholder="NIP" /></div>
            <div><Label>Rail Name *</Label><Input value={form.railName} onChange={(e) => set('railName', e.target.value)} placeholder="NIBSS Instant Payment" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.railType} onValueChange={(v) => set('railType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOMESTIC">Domestic</SelectItem>
                  <SelectItem value="INTERNATIONAL">International</SelectItem>
                  <SelectItem value="REGIONAL">Regional</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Provider *</Label><Input value={form.provider} onChange={(e) => set('provider', e.target.value)} placeholder="NIBSS" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Settlement Speed</Label>
              <Select value={form.settlementSpeed} onValueChange={(v) => set('settlementSpeed', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTANT">Instant</SelectItem>
                  <SelectItem value="SAME_DAY">Same Day</SelectItem>
                  <SelectItem value="NEXT_DAY">Next Day</SelectItem>
                  <SelectItem value="T_PLUS_2">T+2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority Rank</Label><Input type="number" value={form.priorityRank} onChange={(e) => set('priorityRank', Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Flat Fee</Label><Input type="number" value={form.flatFee} onChange={(e) => set('flatFee', Number(e.target.value))} /></div>
            <div><Label>Fee %</Label><Input type="number" step="0.01" value={form.percentageFee} onChange={(e) => set('percentageFee', Number(e.target.value))} /></div>
            <div><Label>Fee Currency</Label><Input value={form.feeCurrency} onChange={(e) => set('feeCurrency', e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ ...form, isActive: true, isAvailable: true, supportedCurrencies: [form.feeCurrency], supportedCountries: ['NG'], uptimePct: 100, avgProcessingMs: 0, minAmount: 0, maxAmount: 999999999 })} disabled={isSubmitting || !form.railCode || !form.railName}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateRuleDialog({ open, onClose, rails, onSubmit, isSubmitting }: { open: boolean; onClose: () => void; rails: PaymentRail[]; onSubmit: (d: Partial<PaymentRoutingRule>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ ruleName: '', rulePriority: 1, sourceCountry: 'NG', destinationCountry: '', currencyCode: 'NGN', paymentType: '', channel: '', customerSegment: '', preferredRailCode: '', fallbackRailCode: '', optimizeFor: 'COST', effectiveFrom: '', effectiveTo: '' });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Routing Rule</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Rule Name *</Label><Input value={form.ruleName} onChange={(e) => set('ruleName', e.target.value)} /></div>
          <div><Label>Priority</Label><Input type="number" value={form.rulePriority} onChange={(e) => set('rulePriority', Number(e.target.value))} /></div>
          <div><Label>Source Country</Label><Input value={form.sourceCountry} onChange={(e) => set('sourceCountry', e.target.value)} /></div>
          <div><Label>Destination Country</Label><Input value={form.destinationCountry} onChange={(e) => set('destinationCountry', e.target.value)} /></div>
          <div><Label>Currency</Label><Input value={form.currencyCode} onChange={(e) => set('currencyCode', e.target.value)} /></div>
          <div><Label>Preferred Rail *</Label>
            <Select value={form.preferredRailCode} onValueChange={(v) => set('preferredRailCode', v)}>
              <SelectTrigger><SelectValue placeholder="Select rail" /></SelectTrigger>
              <SelectContent>{rails.map((r) => <SelectItem key={r.railCode} value={r.railCode}>{r.railName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Fallback Rail</Label>
            <Select value={form.fallbackRailCode} onValueChange={(v) => set('fallbackRailCode', v)}>
              <SelectTrigger><SelectValue placeholder="Select rail" /></SelectTrigger>
              <SelectContent>{rails.map((r) => <SelectItem key={r.railCode} value={r.railCode}>{r.railName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Optimize For</Label>
            <Select value={form.optimizeFor} onValueChange={(v) => set('optimizeFor', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COST">Cost</SelectItem>
                <SelectItem value="SPEED">Speed</SelectItem>
                <SelectItem value="AVAILABILITY">Availability</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Payment Type</Label><Input value={form.paymentType} onChange={(e) => set('paymentType', e.target.value)} placeholder="DOMESTIC, SWIFT" /></div>
          <div><Label>Effective From</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} /></div>
          <div><Label>Effective To</Label><Input type="date" value={form.effectiveTo} onChange={(e) => set('effectiveTo', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ ...form, isActive: true, minAmount: 0, maxAmount: 999999999 })} disabled={isSubmitting || !form.ruleName || !form.preferredRailCode}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
