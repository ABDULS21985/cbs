import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Plus, X, Receipt, ToggleLeft, ToggleRight, AlertTriangle, Edit, Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { billerAdminApi } from '../api/billerAdminApi';
import type { Biller, BillerCategory, BillerCreateRequest } from '../types/biller';

// ─── Constants ────────────────────────────────────────────────────────────────

const BILLER_CATEGORIES: BillerCategory[] = [
  'ELECTRICITY', 'WATER', 'INTERNET', 'TV', 'INSURANCE',
  'GOVERNMENT', 'EDUCATION', 'TELECOMMUNICATIONS', 'OTHERS',
];

const CATEGORY_COLORS: Record<string, string> = {
  ELECTRICITY: 'bg-yellow-100 text-yellow-800',
  WATER: 'bg-blue-100 text-blue-800',
  INTERNET: 'bg-violet-100 text-violet-800',
  TV: 'bg-pink-100 text-pink-800',
  INSURANCE: 'bg-green-100 text-green-800',
  GOVERNMENT: 'bg-slate-100 text-slate-800',
  EDUCATION: 'bg-indigo-100 text-indigo-800',
  TELECOMMUNICATIONS: 'bg-orange-100 text-orange-800',
  OTHERS: 'bg-gray-100 text-gray-800',
};

// ─── Biller Form Modal ───────────────────────────────────────────────────────

interface BillerFormProps {
  biller?: Biller | null;
  onClose: () => void;
}

function BillerFormModal({ biller, onClose }: BillerFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!biller;

  const [form, setForm] = useState<BillerCreateRequest>({
    billerCode: biller?.billerCode ?? '',
    billerName: biller?.billerName ?? '',
    billerCategory: biller?.billerCategory ?? 'OTHERS',
    settlementBankCode: biller?.settlementBankCode ?? '',
    settlementAccountNumber: biller?.settlementAccountNumber ?? '',
    customerIdLabel: biller?.customerIdLabel ?? 'Account Number',
    customerIdRegex: biller?.customerIdRegex ?? '',
    minAmount: biller?.minAmount ?? undefined,
    maxAmount: biller?.maxAmount ?? undefined,
    currencyCode: biller?.currencyCode ?? 'NGN',
    flatFee: biller?.flatFee ?? 0,
    percentageFee: biller?.percentageFee ?? 0,
    feeCap: biller?.feeCap ?? undefined,
    feeBearer: biller?.feeBearer ?? 'CUSTOMER',
    contactEmail: biller?.contactEmail ?? '',
    contactPhone: biller?.contactPhone ?? '',
    isActive: biller?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: BillerCreateRequest) => billerAdminApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billers'] });
      toast.success('Biller created successfully');
      onClose();
    },
    onError: () => toast.error('Failed to create biller'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<BillerCreateRequest>) => billerAdminApi.update(biller!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billers'] });
      toast.success('Biller updated successfully');
      onClose();
    },
    onError: () => toast.error('Failed to update biller'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : Number(value))
        : (type === 'checkbox' && e.target instanceof HTMLInputElement) ? e.target.checked
        : value,
    }));
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">{isEditing ? 'Edit Biller' : 'Add Biller'}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Biller Code</label>
              <input name="billerCode" value={form.billerCode} onChange={handleChange} required disabled={isEditing}
                placeholder="e.g. EKEDC" className={cn(inputCls, isEditing && 'opacity-60')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <select name="billerCategory" value={form.billerCategory} onChange={handleChange} className={inputCls}>
                {BILLER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Biller Name</label>
            <input name="billerName" value={form.billerName} onChange={handleChange} required
              placeholder="e.g. Eko Electricity Distribution Company" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
              <select name="currencyCode" value={form.currencyCode} onChange={handleChange} className={inputCls}>
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fee Bearer</label>
              <select name="feeBearer" value={form.feeBearer} onChange={handleChange} className={inputCls}>
                <option value="CUSTOMER">Customer</option>
                <option value="BILLER">Biller</option>
                <option value="SPLIT">Split</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Customer ID Label</label>
            <input name="customerIdLabel" value={form.customerIdLabel} onChange={handleChange}
              placeholder="e.g. Meter Number" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Settlement Bank Code</label>
              <input name="settlementBankCode" value={form.settlementBankCode || ''} onChange={handleChange}
                placeholder="e.g. 044" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Settlement Account</label>
              <input name="settlementAccountNumber" value={form.settlementAccountNumber || ''} onChange={handleChange}
                placeholder="Account number" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Flat Fee</label>
              <input name="flatFee" type="number" min={0} step={0.01} value={form.flatFee ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Percentage Fee (%)</label>
              <input name="percentageFee" type="number" min={0} step={0.01} max={100} value={form.percentageFee ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fee Cap</label>
              <input name="feeCap" type="number" min={0} step={0.01} value={form.feeCap ?? ''} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min Amount</label>
              <input name="minAmount" type="number" min={0} step={0.01} value={form.minAmount ?? ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Amount</label>
              <input name="maxAmount" type="number" min={0} step={0.01} value={form.maxAmount ?? ''} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Email</label>
              <input name="contactEmail" type="email" value={form.contactEmail || ''} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Phone</label>
              <input name="contactPhone" value={form.contactPhone || ''} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Biller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BillerAdminPage() {
  useEffect(() => { document.title = 'Biller Management | CBS'; }, []);

  const { data: billers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'billers'],
    queryFn: () => billerAdminApi.getAll(),
    staleTime: 60_000,
  });

  const [showForm, setShowForm] = useState(false);
  const [editBiller, setEditBiller] = useState<Biller | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      billerAdminApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'billers'] });
      toast.success('Biller status updated');
    },
    onError: () => toast.error('Failed to update biller status'),
  });

  const filtered = categoryFilter === 'ALL'
    ? billers
    : billers.filter((b) => b.billerCategory === categoryFilter);

  const activeBillers = billers.filter((b) => b.isActive).length;
  const categories = [...new Set(billers.map((b) => b.billerCategory))];

  const columns: ColumnDef<Biller, unknown>[] = [
    {
      accessorKey: 'billerCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.billerCode}</span>,
    },
    { accessorKey: 'billerName', header: 'Name' },
    {
      accessorKey: 'billerCategory',
      header: 'Category',
      cell: ({ row }) => (
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', CATEGORY_COLORS[row.original.billerCategory] || CATEGORY_COLORS.OTHERS)}>
          {row.original.billerCategory}
        </span>
      ),
    },
    { accessorKey: 'currencyCode', header: 'Currency' },
    {
      accessorKey: 'flatFee',
      header: 'Flat Fee',
      cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.flatFee, row.original.currencyCode)}</span>,
    },
    {
      accessorKey: 'percentageFee',
      header: '% Fee',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.percentageFee}%</span>,
    },
    { accessorKey: 'customerIdLabel', header: 'Customer ID Label' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setEditBiller(row.original); setShowForm(true); }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMutation.mutate({ id: row.original.id, isActive: !row.original.isActive })}
            disabled={toggleMutation.isPending}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={row.original.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.original.isActive ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Biller Management"
        subtitle="Register and manage bill payment billers"
        actions={
          <button
            onClick={() => { setEditBiller(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Biller
          </button>
        }
      />

      <div className="page-container space-y-5">
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load billers.</span>
            <button onClick={() => refetch()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Billers" value={billers.length} format="number" icon={Receipt} loading={isLoading} />
          <StatCard label="Active" value={activeBillers} format="number" loading={isLoading} />
          <StatCard label="Inactive" value={billers.length - activeBillers} format="number" loading={isLoading} />
          <StatCard label="Categories" value={categories.length} format="number" loading={isLoading} />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">All Categories</option>
            {BILLER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} biller{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="card">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            enableGlobalFilter
            enableExport
            exportFilename="billers"
            emptyMessage="No billers registered"
          />
        </div>
      </div>

      {showForm && (
        <BillerFormModal
          biller={editBiller}
          onClose={() => { setShowForm(false); setEditBiller(null); }}
        />
      )}
    </>
  );
}
