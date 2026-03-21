import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Globe, Send, Users, DollarSign, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { remittancesApi } from '../api/remittanceApi';
import type { RemittanceCorridor, RemittanceTransaction, RemittanceBeneficiary } from '../types/remittance';

export function RemittancePage() {
  useEffect(() => { document.title = 'Remittances | CBS'; }, []);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'corridors' | 'transactions' | 'beneficiaries'>('corridors');
  const [showNewCorridor, setShowNewCorridor] = useState(false);
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [customerIdFilter, setCustomerIdFilter] = useState('');

  // Queries
  const { data: corridors = [], isLoading: corridorsLoading, isError: corridorsError, refetch: refetchCorridors } = useQuery({
    queryKey: ['remittances', 'corridors'],
    queryFn: () => remittancesApi.getAllCorridors(),
  });

  const { data: beneficiaries = [], isLoading: bensLoading } = useQuery({
    queryKey: ['remittances', 'beneficiaries'],
    queryFn: () => remittancesApi.getAllBeneficiaries(),
  });

  const customerId = Number(customerIdFilter);
  const { data: transactions = [], isLoading: txnLoading } = useQuery({
    queryKey: ['remittances', 'history', customerId],
    queryFn: () => remittancesApi.getHistory(customerId),
    enabled: customerId > 0,
  });

  // Mutations
  const createCorridorMutation = useMutation({
    mutationFn: (data: Partial<RemittanceCorridor>) => remittancesApi.createCorridor(data),
    onSuccess: () => { toast.success('Corridor created'); queryClient.invalidateQueries({ queryKey: ['remittances', 'corridors'] }); setShowNewCorridor(false); },
    onError: () => toast.error('Failed to create corridor'),
  });

  const createBenMutation = useMutation({
    mutationFn: (data: Partial<RemittanceBeneficiary>) => remittancesApi.addBeneficiary(data),
    onSuccess: () => { toast.success('Beneficiary added'); queryClient.invalidateQueries({ queryKey: ['remittances', 'beneficiaries'] }); setShowNewBeneficiary(false); },
    onError: () => toast.error('Failed to add beneficiary'),
  });

  const corridorColumns: ColumnDef<RemittanceCorridor, unknown>[] = [
    { accessorKey: 'corridorCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.corridorCode}</span> },
    { accessorKey: 'sourceCountry', header: 'Source' },
    { accessorKey: 'destinationCountry', header: 'Destination' },
    { accessorKey: 'sourceCurrency', header: 'Source CCY' },
    { accessorKey: 'destinationCurrency', header: 'Dest CCY' },
    { accessorKey: 'flatFee', header: 'Flat Fee', cell: ({ row }) => formatMoney(row.original.flatFee, row.original.sourceCurrency) },
    { accessorKey: 'percentageFee', header: 'Fee %', cell: ({ row }) => `${row.original.percentageFee}%` },
    { accessorKey: 'fxMarkupPct', header: 'FX Markup %', cell: ({ row }) => `${row.original.fxMarkupPct}%` },
    { accessorKey: 'minAmount', header: 'Min', cell: ({ row }) => formatMoney(row.original.minAmount, row.original.sourceCurrency) },
    { accessorKey: 'maxAmount', header: 'Max', cell: ({ row }) => formatMoney(row.original.maxAmount, row.original.sourceCurrency) },
    { accessorKey: 'settlementDays', header: 'Settlement' },
    { accessorKey: 'imtoPartnerName', header: 'IMTO Partner' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ];

  const transactionColumns: ColumnDef<RemittanceTransaction, unknown>[] = [
    { accessorKey: 'remittanceRef', header: 'Reference', cell: ({ row }) => <span className="font-mono text-xs">{row.original.remittanceRef}</span> },
    { accessorKey: 'sourceAmount', header: 'Source Amount', cell: ({ row }) => formatMoney(row.original.sourceAmount, row.original.sourceCurrency) },
    { accessorKey: 'destinationAmount', header: 'Dest Amount', cell: ({ row }) => formatMoney(row.original.destinationAmount, row.original.destinationCurrency) },
    { accessorKey: 'fxRate', header: 'FX Rate', cell: ({ row }) => row.original.fxRate?.toFixed(4) },
    { accessorKey: 'totalFee', header: 'Fee', cell: ({ row }) => formatMoney(row.original.totalFee, row.original.sourceCurrency) },
    { accessorKey: 'purposeCode', header: 'Purpose' },
    { accessorKey: 'paymentRailCode', header: 'Rail' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => formatDateTime(row.original.createdAt) },
  ];

  const beneficiaryColumns: ColumnDef<RemittanceBeneficiary, unknown>[] = [
    { accessorKey: 'beneficiaryName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.beneficiaryName}</span> },
    { accessorKey: 'beneficiaryCountry', header: 'Country' },
    { accessorKey: 'bankName', header: 'Bank' },
    { accessorKey: 'accountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span> },
    { accessorKey: 'relationship', header: 'Relationship' },
    { accessorKey: 'isVerified', header: 'Verified', cell: ({ row }) => row.original.isVerified ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ];

  const activeCorridors = corridors.filter((c) => c.isActive).length;

  const tabs = [
    { key: 'corridors' as const, label: 'Corridors' },
    { key: 'transactions' as const, label: 'Transactions' },
    { key: 'beneficiaries' as const, label: 'Beneficiaries' },
  ];

  return (
    <>
      <PageHeader
        title="Remittances"
        subtitle="Cross-border remittance corridors, transactions, and beneficiaries"
        actions={
          <div className="flex gap-2">
            {tab === 'corridors' && <Button onClick={() => setShowNewCorridor(true)}><Plus className="w-4 h-4 mr-1" /> New Corridor</Button>}
            {tab === 'beneficiaries' && <Button onClick={() => setShowNewBeneficiary(true)}><Plus className="w-4 h-4 mr-1" /> Add Beneficiary</Button>}
          </div>
        }
      />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Corridors" value={corridors.length} format="number" icon={Globe} loading={corridorsLoading} />
          <StatCard label="Active Corridors" value={activeCorridors} format="number" icon={Send} loading={corridorsLoading} />
          <StatCard label="Beneficiaries" value={beneficiaries.length} format="number" icon={Users} loading={bensLoading} />
          <StatCard label="Transactions" value={transactions.length} format="number" icon={DollarSign} loading={txnLoading} />
        </div>

        {corridorsError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm text-red-700 dark:text-red-400">Failed to load remittance data.</p></div>
            <button onClick={() => refetchCorridors()} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
          </div>
        )}

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'corridors' && (
          <DataTable columns={corridorColumns} data={corridors} isLoading={corridorsLoading} enableGlobalFilter searchPlaceholder="Search corridors..." emptyMessage="No corridors configured" />
        )}

        {tab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <Label>Customer ID</Label>
                <Input type="number" value={customerIdFilter} onChange={(e) => setCustomerIdFilter(e.target.value)} placeholder="Enter customer ID" className="w-48" />
              </div>
            </div>
            {customerId > 0 ? (
              <DataTable columns={transactionColumns} data={transactions} isLoading={txnLoading} enableGlobalFilter emptyMessage="No transactions for this customer" />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Enter a customer ID to view remittance history</p>
            )}
          </div>
        )}

        {tab === 'beneficiaries' && (
          <DataTable columns={beneficiaryColumns} data={beneficiaries} isLoading={bensLoading} enableGlobalFilter searchPlaceholder="Search beneficiaries..." emptyMessage="No beneficiaries registered" />
        )}
      </div>

      {/* Create Corridor Dialog */}
      {showNewCorridor && (
        <CreateCorridorDialog open onClose={() => setShowNewCorridor(false)} onSubmit={(d) => createCorridorMutation.mutate(d)} isSubmitting={createCorridorMutation.isPending} />
      )}

      {/* Create Beneficiary Dialog */}
      {showNewBeneficiary && (
        <CreateBeneficiaryDialog open onClose={() => setShowNewBeneficiary(false)} onSubmit={(d) => createBenMutation.mutate(d)} isSubmitting={createBenMutation.isPending} />
      )}
    </>
  );
}

function CreateCorridorDialog({ open, onClose, onSubmit, isSubmitting }: { open: boolean; onClose: () => void; onSubmit: (d: Partial<RemittanceCorridor>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ corridorCode: '', sourceCountry: 'NG', destinationCountry: '', sourceCurrency: 'NGN', destinationCurrency: '', flatFee: 0, percentageFee: 0, feeCap: 0, fxMarkupPct: 0, minAmount: 0, maxAmount: 0, dailyLimit: 0, monthlyLimit: 0, settlementDays: 1, imtoPartnerCode: '', imtoPartnerName: '' });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Remittance Corridor</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Corridor Code *</Label><Input value={form.corridorCode} onChange={(e) => set('corridorCode', e.target.value)} placeholder="NG-GH" /></div>
          <div><Label>Source Country *</Label><Input value={form.sourceCountry} onChange={(e) => set('sourceCountry', e.target.value)} /></div>
          <div><Label>Destination Country *</Label><Input value={form.destinationCountry} onChange={(e) => set('destinationCountry', e.target.value)} /></div>
          <div><Label>Source Currency *</Label><Input value={form.sourceCurrency} onChange={(e) => set('sourceCurrency', e.target.value)} /></div>
          <div><Label>Destination Currency *</Label><Input value={form.destinationCurrency} onChange={(e) => set('destinationCurrency', e.target.value)} /></div>
          <div><Label>Flat Fee</Label><Input type="number" value={form.flatFee} onChange={(e) => set('flatFee', Number(e.target.value))} /></div>
          <div><Label>Fee %</Label><Input type="number" step="0.01" value={form.percentageFee} onChange={(e) => set('percentageFee', Number(e.target.value))} /></div>
          <div><Label>FX Markup %</Label><Input type="number" step="0.01" value={form.fxMarkupPct} onChange={(e) => set('fxMarkupPct', Number(e.target.value))} /></div>
          <div><Label>Min Amount</Label><Input type="number" value={form.minAmount} onChange={(e) => set('minAmount', Number(e.target.value))} /></div>
          <div><Label>Max Amount</Label><Input type="number" value={form.maxAmount} onChange={(e) => set('maxAmount', Number(e.target.value))} /></div>
          <div><Label>Settlement Days</Label><Input type="number" value={form.settlementDays} onChange={(e) => set('settlementDays', Number(e.target.value))} /></div>
          <div><Label>IMTO Partner Name</Label><Input value={form.imtoPartnerName} onChange={(e) => set('imtoPartnerName', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ ...form, isActive: true, requiresPurposeCode: true, requiresSourceOfFunds: true, blockedPurposeCodes: [] })} disabled={isSubmitting || !form.corridorCode || !form.destinationCountry}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateBeneficiaryDialog({ open, onClose, onSubmit, isSubmitting }: { open: boolean; onClose: () => void; onSubmit: (d: Partial<RemittanceBeneficiary>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ customerId: 0, beneficiaryName: '', beneficiaryCountry: '', beneficiaryCity: '', bankName: '', bankSwiftCode: '', accountNumber: '', relationship: '' });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Remittance Beneficiary</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Customer ID *</Label><Input type="number" value={form.customerId || ''} onChange={(e) => set('customerId', Number(e.target.value))} /></div>
          <div><Label>Beneficiary Name *</Label><Input value={form.beneficiaryName} onChange={(e) => set('beneficiaryName', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Country *</Label><Input value={form.beneficiaryCountry} onChange={(e) => set('beneficiaryCountry', e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.beneficiaryCity} onChange={(e) => set('beneficiaryCity', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Bank Name *</Label><Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></div>
            <div><Label>SWIFT Code</Label><Input value={form.bankSwiftCode} onChange={(e) => set('bankSwiftCode', e.target.value)} /></div>
          </div>
          <div><Label>Account Number *</Label><Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} /></div>
          <div><Label>Relationship</Label><Input value={form.relationship} onChange={(e) => set('relationship', e.target.value)} placeholder="e.g. Family, Business" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.beneficiaryName || !form.customerId}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Add Beneficiary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
