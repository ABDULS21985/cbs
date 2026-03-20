import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage, ConfirmDialog } from '@/components/shared';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { posLoansApi } from '../api/posLoanApi';
import { usePosLoansByCustomer, usePosLoansByMerchant, useDisbursePosLoan, useProcessPosLoanReturn } from '../hooks/useLendingExt';
import type { PosLoan } from '../types/posLoan';
import { apiPost } from '@/lib/api';

export function PosLendingPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchedCustomerId, setSearchedCustomerId] = useState(0);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [searchedMerchantId, setSearchedMerchantId] = useState(0);
  const [returnTarget, setReturnTarget] = useState<PosLoan | null>(null);

  const { data: customerLoans = [] } = usePosLoansByCustomer(searchedCustomerId);
  const { data: merchantLoans = [] } = usePosLoansByMerchant(searchedMerchantId);
  const disburseMut = useDisbursePosLoan();
  const returnMut = useProcessPosLoanReturn();

  // Use customer loans as "all" for stats (or fetch from a different source)
  const allLoans = useMemo(() => [...customerLoans, ...merchantLoans].filter((l, i, arr) => arr.findIndex(x => x.id === l.id) === i), [customerLoans, merchantLoans]);

  const [form, setForm] = useState({
    customerId: 0, accountId: 0, merchantId: '', merchantName: '', merchantCategory: '',
    itemDescription: '', purchaseAmount: 0, downPayment: 0, interestRate: 0, isZeroInterest: false,
    merchantSubsidyPct: 0, termMonths: 12, promotionalRate: 0, promotionalEndDate: '', revertRate: 0,
  });

  const financedAmount = form.purchaseAmount - form.downPayment;
  const monthlyPayment = financedAmount > 0 && form.termMonths > 0
    ? form.isZeroInterest ? financedAmount / form.termMonths : (financedAmount * (1 + form.interestRate / 100)) / form.termMonths
    : 0;

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<PosLoan>('/api/v1/pos-loans', data),
    onSuccess: () => { toast.success('POS loan created'); qc.invalidateQueries({ queryKey: ['pos-loans'] }); setShowCreate(false); },
    onError: () => toast.error('Failed to create POS loan'),
  });

  const loanCols: ColumnDef<PosLoan, unknown>[] = [
    { accessorKey: 'posLoanNumber', header: 'POS Loan #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.posLoanNumber}</span> },
    { accessorKey: 'merchantName', header: 'Merchant', cell: ({ row }) => <span className="text-sm">{row.original.merchantName}</span> },
    { accessorKey: 'itemDescription', header: 'Item', cell: ({ row }) => <span className="text-xs truncate max-w-[150px] block">{row.original.itemDescription}</span> },
    { accessorKey: 'purchaseAmount', header: 'Purchase', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.purchaseAmount)}</span> },
    { accessorKey: 'financedAmount', header: 'Financed', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.financedAmount)}</span> },
    { accessorKey: 'interestRate', header: 'Rate', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isZeroInterest ? <span className="text-green-600 font-medium">0% (PROMO)</span> : `${row.original.interestRate}%`}</span> },
    { accessorKey: 'termMonths', header: 'Term', cell: ({ row }) => <span className="text-xs">{row.original.termMonths}m</span> },
    { accessorKey: 'monthlyPayment', header: 'Monthly', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.monthlyPayment)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot /> },
    { accessorKey: 'disbursementDate', header: 'Disbursed', cell: ({ row }) => <span className="text-xs">{row.original.disbursementDate ? formatDate(row.original.disbursementDate) : '—'}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        const loan = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {loan.status === 'PENDING' && (
              <button onClick={() => disburseMut.mutate(loan.posLoanNumber, { onSuccess: () => toast.success('Disbursed') })}
                className="px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-800 hover:bg-green-200"><Check className="w-3 h-3 inline" /> Disburse</button>
            )}
            {loan.status === 'ACTIVE' && (
              <button onClick={() => setReturnTarget(loan)}
                className="px-2 py-1 text-[10px] font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200"><RotateCcw className="w-3 h-3 inline" /> Return</button>
            )}
          </div>
        );
      },
    },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  const tabs = [
    {
      id: 'all', label: 'All POS Loans',
      content: (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-3">Search by customer or merchant to load loans</p>
          <DataTable columns={loanCols} data={allLoans} enableGlobalFilter enableExport exportFilename="pos-loans" emptyMessage="Search to load POS loans" />
        </div>
      ),
    },
    {
      id: 'merchant', label: 'By Merchant',
      content: (
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input type="number" value={merchantSearch} onChange={(e) => setMerchantSearch(e.target.value)} placeholder="Merchant ID" className={cn(inputCls, 'max-w-xs font-mono')} />
            <button onClick={() => setSearchedMerchantId(Number(merchantSearch))} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Search</button>
          </div>
          {searchedMerchantId > 0 && <DataTable columns={loanCols} data={merchantLoans} enableGlobalFilter emptyMessage={`No loans for merchant ${searchedMerchantId}`} />}
        </div>
      ),
    },
    {
      id: 'customer', label: 'By Customer',
      content: (
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input type="number" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Customer ID" className={cn(inputCls, 'max-w-xs font-mono')} />
            <button onClick={() => setSearchedCustomerId(Number(customerSearch))} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Search</button>
          </div>
          {searchedCustomerId > 0 && <DataTable columns={loanCols} data={customerLoans} enableGlobalFilter emptyMessage={`No loans for customer ${searchedCustomerId}`} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="POS & Buy-Now-Pay-Later Lending" subtitle="Point-of-sale financing and installment plans"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New POS Loan</button>} />

      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-label">Total Loans</div><div className="stat-value">{allLoans.length}</div></div>
          <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value text-green-600">{allLoans.filter(l => l.status === 'ACTIVE').length}</div></div>
          <div className="stat-card"><div className="stat-label">Zero-Interest</div><div className="stat-value text-blue-600">{allLoans.filter(l => l.isZeroInterest).length}</div></div>
          <div className="stat-card"><div className="stat-label">Total Financed</div><div className="stat-value text-sm font-mono">{formatMoney(allLoans.reduce((s, l) => s + l.financedAmount, 0))}</div></div>
        </div>
        <TabsPage tabs={tabs} syncWithUrl />
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10"><h2 className="text-base font-semibold">New POS Loan</h2><button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted">&times;</button></div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1">Customer ID</label><input type="number" value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium mb-1">Account ID</label><input type="number" value={form.accountId || ''} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1">Merchant ID</label><input value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium mb-1">Merchant Name</label><input value={form.merchantName} onChange={(e) => setForm({ ...form, merchantName: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label className="block text-xs font-medium mb-1">Item Description</label><input value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <MoneyInput label="Purchase Amount" value={form.purchaseAmount} onChange={(v) => setForm({ ...form, purchaseAmount: v })} currency="NGN" />
                <MoneyInput label="Down Payment" value={form.downPayment} onChange={(v) => setForm({ ...form, downPayment: v })} currency="NGN" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-medium mb-1">Rate %</label><input type="number" step="0.01" value={form.interestRate || ''} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })} className={inputCls} /></div>
                <div><label className="block text-xs font-medium mb-1">Term (months)</label><input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })} className={inputCls} /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.isZeroInterest} onChange={(e) => setForm({ ...form, isZeroInterest: e.target.checked })} className="accent-primary" /> Zero Interest</label></div>
              </div>
              {financedAmount > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                  <div className="flex justify-between"><span>Financed:</span><span className="font-mono font-bold">{formatMoney(financedAmount)}</span></div>
                  <div className="flex justify-between"><span>Monthly:</span><span className="font-mono">{formatMoney(monthlyPayment)}</span></div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => createMut.mutate({ ...form, financedAmount, monthlyPayment })} disabled={createMut.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createMut.isPending ? 'Creating...' : 'Create Loan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!returnTarget} onClose={() => setReturnTarget(null)}
        onConfirm={() => { if (returnTarget) returnMut.mutate(returnTarget.posLoanNumber, { onSuccess: () => { toast.success('Return processed'); setReturnTarget(null); } }); }}
        title="Process Return" description={returnTarget ? `Process return for POS loan ${returnTarget.posLoanNumber}? This will reverse the merchant disbursement.` : ''}
        confirmLabel="Process Return" variant="destructive" />
    </>
  );
}
