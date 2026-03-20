import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Plus, Pencil, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatters';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import type { Beneficiary, BeneficiaryCreateRequest } from '../../api/wealthApi';
import {
  useAddBeneficiary,
  useUpdateBeneficiary,
  useRemoveBeneficiary,
} from '../../hooks/useWealth';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BeneficiaryManagerProps {
  trustCode: string;
  beneficiaries: Beneficiary[];
  currency: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

const RELATIONSHIPS = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'GRANDCHILD', 'CHARITY', 'OTHER'] as const;

const BLANK_FORM: BeneficiaryCreateRequest = {
  name: '',
  relationship: 'CHILD',
  sharePercent: 0,
  contactInfo: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BeneficiaryManager({ trustCode, beneficiaries, currency }: BeneficiaryManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [form, setForm] = useState<BeneficiaryCreateRequest>(BLANK_FORM);
  const [confirmRemove, setConfirmRemove] = useState<Beneficiary | null>(null);

  const addMutation = useAddBeneficiary(trustCode);
  const updateMutation = useUpdateBeneficiary(trustCode);
  const removeMutation = useRemoveBeneficiary(trustCode);

  // ── Allocation calculations ──

  const totalAllocation = useMemo(
    () => beneficiaries.reduce((sum, b) => sum + b.sharePercent, 0),
    [beneficiaries],
  );

  const projectedTotal = useMemo(() => {
    if (editingBeneficiary) {
      // When editing, subtract the original and add the new value
      return totalAllocation - editingBeneficiary.sharePercent + (form.sharePercent || 0);
    }
    return totalAllocation + (form.sharePercent || 0);
  }, [totalAllocation, editingBeneficiary, form.sharePercent]);

  const allocationColor = totalAllocation === 100 ? 'text-green-600 dark:text-green-400' : totalAllocation > 100 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';

  const projectedColor = projectedTotal === 100 ? 'text-green-600 dark:text-green-400' : projectedTotal > 100 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';

  // ── Pie chart data ──

  const pieData = useMemo(
    () => beneficiaries.map((b) => ({ name: b.name, value: b.sharePercent })),
    [beneficiaries],
  );

  // ── Open modal for add / edit ──

  function openAdd() {
    setEditingBeneficiary(null);
    setForm(BLANK_FORM);
    setShowModal(true);
  }

  function openEdit(b: Beneficiary) {
    setEditingBeneficiary(b);
    setForm({
      name: b.name,
      relationship: b.relationship,
      sharePercent: b.sharePercent,
      contactInfo: b.contactInfo,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingBeneficiary(null);
    setForm(BLANK_FORM);
  }

  // ── Submit ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingBeneficiary) {
      try {
        await updateMutation.mutateAsync({ id: editingBeneficiary.id, data: form });
        toast.success('Beneficiary updated successfully');
        closeModal();
      } catch {
        toast.error('Failed to update beneficiary');
      }
    } else {
      try {
        await addMutation.mutateAsync(form);
        toast.success('Beneficiary added successfully');
        closeModal();
      } catch {
        toast.error('Failed to add beneficiary');
      }
    }
  }

  // ── Remove ──

  async function handleRemove() {
    if (!confirmRemove) return;
    try {
      await removeMutation.mutateAsync(confirmRemove.id);
      toast.success(`${confirmRemove.name} removed`);
      setConfirmRemove(null);
    } catch {
      toast.error('Failed to remove beneficiary');
    }
  }

  // ── Columns ──

  const columns: ColumnDef<Beneficiary, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.name}</span>,
    },
    {
      accessorKey: 'relationship',
      header: 'Relationship',
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.relationship.replace(/_/g, ' ').toLowerCase()}</span>
      ),
    },
    {
      accessorKey: 'sharePercent',
      header: 'Allocation %',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">{formatPercent(row.original.sharePercent, 1)}</span>
      ),
    },
    {
      accessorKey: 'contactInfo',
      header: 'Contact',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.contactInfo || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => <StatusBadge status="ACTIVE" dot />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmRemove(row.original);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header + Total Allocation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold">Beneficiaries</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total Allocation:</span>
            <span className={cn('text-sm font-bold font-mono', allocationColor)}>
              {formatPercent(totalAllocation, 1)}
            </span>
            {totalAllocation !== 100 && (
              <AlertTriangle className={cn('w-3.5 h-3.5', totalAllocation > 100 ? 'text-red-500' : 'text-amber-500')} />
            )}
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Beneficiary
        </button>
      </div>

      {/* Layout: Table + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DataTable */}
        <div className="lg:col-span-2 rounded-xl border bg-card">
          <DataTable
            columns={columns}
            data={beneficiaries}
            isLoading={false}
            enableGlobalFilter
            pageSize={10}
            emptyMessage="No beneficiaries on record"
          />
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Allocation Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ value }) => `${value}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              No beneficiaries
            </div>
          )}

          {/* Allocation summary below chart */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Allocated</span>
              <span className={cn('font-mono font-bold', allocationColor)}>
                {formatPercent(totalAllocation, 1)}
              </span>
            </div>
            {totalAllocation < 100 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Unallocated</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatPercent(100 - totalAllocation, 1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">
                {editingBeneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Full legal name"
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Relationship *</label>
                <select
                  required
                  value={form.relationship}
                  onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allocation % */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Allocation % *</label>
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.sharePercent || ''}
                  onChange={(e) => setForm((f) => ({ ...f, sharePercent: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. 25"
                />
                {/* Allocation warning */}
                {showModal && form.sharePercent > 0 && projectedTotal !== 100 && (
                  <div
                    className={cn(
                      'mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                      projectedTotal > 100
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {projectedTotal > 100
                        ? `Total allocation would be ${formatPercent(projectedTotal, 1)} (exceeds 100%)`
                        : `Total allocation would be ${formatPercent(projectedTotal, 1)} (under 100%)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Contact Info</label>
                <input
                  type="text"
                  value={form.contactInfo}
                  onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Email or phone"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                    isSubmitting && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBeneficiary ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
        title="Remove Beneficiary"
        description={`Are you sure you want to remove ${confirmRemove?.name}? This action cannot be undone. Their ${formatPercent(confirmRemove?.sharePercent ?? 0, 1)} allocation will be freed.`}
        confirmLabel="Remove"
        variant="destructive"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
