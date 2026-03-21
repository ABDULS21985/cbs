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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared';
import { Users, DollarSign, FileCheck, AlertTriangle, Plus, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { usePayrollBatches, usePayrollItems, useCreatePayrollBatch, useValidatePayrollBatch, useApprovePayrollBatch, useProcessPayrollBatch } from '../hooks/usePaymentsExt';
import type { PayrollBatch, PayrollItem } from '../types/payroll';

export function PayrollPage() {
  useEffect(() => { document.title = 'Payroll Processing | CBS'; }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'validate' | 'approve' | 'process'; batchId: string } | null>(null);

  const { data: batches = [], isLoading, isError, refetch } = usePayrollBatches();
  const { data: items = [], isLoading: itemsLoading } = usePayrollItems(selectedBatchId || '');

  const createMutation = useCreatePayrollBatch();
  const validateMutation = useValidatePayrollBatch();
  const approveMutation = useApprovePayrollBatch();
  const processMutation = useProcessPayrollBatch();

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, batchId } = confirmAction;
    const mutation = type === 'validate' ? validateMutation : type === 'approve' ? approveMutation : processMutation;
    mutation.mutate(batchId, {
      onSuccess: () => { toast.success(`Batch ${type}d successfully`); setConfirmAction(null); },
      onError: () => { toast.error(`Failed to ${type} batch`); setConfirmAction(null); },
    });
  };

  const batchColumns: ColumnDef<PayrollBatch, unknown>[] = [
    { accessorKey: 'batchId', header: 'Batch ID', cell: ({ row }) => (
      <button onClick={() => setSelectedBatchId(row.original.batchId)} className="font-mono text-xs text-primary hover:underline">{row.original.batchId}</button>
    )},
    { accessorKey: 'companyName', header: 'Company', cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
    { accessorKey: 'payrollType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.payrollType} /> },
    { accessorKey: 'paymentDate', header: 'Pay Date', cell: ({ row }) => formatDate(row.original.paymentDate) },
    { accessorKey: 'employeeCount', header: 'Employees', cell: ({ row }) => row.original.employeeCount?.toLocaleString() },
    { accessorKey: 'totalGross', header: 'Gross', cell: ({ row }) => formatMoney(row.original.totalGross, row.original.currency) },
    { accessorKey: 'totalDeductions', header: 'Deductions', cell: ({ row }) => formatMoney(row.original.totalDeductions, row.original.currency) },
    { accessorKey: 'totalNet', header: 'Net', cell: ({ row }) => <span className="font-medium">{formatMoney(row.original.totalNet, row.original.currency)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => {
      const s = row.original.status;
      const bid = row.original.batchId;
      return (
        <div className="flex gap-1">
          {s === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'validate', batchId: bid })}>Validate</Button>}
          {s === 'VALIDATED' && <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'approve', batchId: bid })}>Approve</Button>}
          {s === 'APPROVED' && <Button size="sm" onClick={() => setConfirmAction({ type: 'process', batchId: bid })}>Process</Button>}
        </div>
      );
    }},
  ];

  const itemColumns: ColumnDef<PayrollItem, unknown>[] = [
    { accessorKey: 'employeeId', header: 'Employee ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.employeeId}</span> },
    { accessorKey: 'employeeName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span> },
    { accessorKey: 'creditAccountNumber', header: 'Account', cell: ({ row }) => <span className="font-mono text-xs">{row.original.creditAccountNumber}</span> },
    { accessorKey: 'grossAmount', header: 'Gross', cell: ({ row }) => formatMoney(row.original.grossAmount) },
    { accessorKey: 'taxAmount', header: 'Tax', cell: ({ row }) => formatMoney(row.original.taxAmount) },
    { accessorKey: 'pensionAmount', header: 'Pension', cell: ({ row }) => formatMoney(row.original.pensionAmount) },
    { accessorKey: 'otherDeductions', header: 'Other', cell: ({ row }) => formatMoney(row.original.otherDeductions) },
    { accessorKey: 'netAmount', header: 'Net', cell: ({ row }) => <span className="font-medium">{formatMoney(row.original.netAmount)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'failureReason', header: 'Failure Reason', cell: ({ row }) => row.original.failureReason ? <span className="text-xs text-red-600">{row.original.failureReason}</span> : '—' },
  ];

  const totalNet = batches.reduce((sum, b) => sum + (b.totalNet || 0), 0);
  const totalEmployees = batches.reduce((sum, b) => sum + (b.employeeCount || 0), 0);
  const pendingBatches = batches.filter((b) => b.status === 'DRAFT' || b.status === 'VALIDATED').length;

  return (
    <>
      <PageHeader
        title="Payroll Processing"
        subtitle="Corporate payroll batch management — validation, approval, and disbursement"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Payroll Batch</Button>}
      />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Batches" value={batches.length} format="number" icon={FileCheck} loading={isLoading} />
          <StatCard label="Total Employees" value={totalEmployees} format="number" icon={Users} loading={isLoading} />
          <StatCard label="Total Net Amount" value={totalNet} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Pending Action" value={pendingBatches} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        {isError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm text-red-700 dark:text-red-400">Failed to load payroll data.</p></div>
            <button onClick={() => refetch()} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
          </div>
        )}

        {selectedBatchId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedBatchId(null)}>← Back to Batches</Button>
              <span className="text-sm text-muted-foreground font-mono">Batch: {selectedBatchId}</span>
            </div>
            <DataTable columns={itemColumns} data={items} isLoading={itemsLoading} enableGlobalFilter searchPlaceholder="Search employees..." emptyMessage="No items in this batch" />
          </div>
        ) : (
          <DataTable columns={batchColumns} data={batches} isLoading={isLoading} enableGlobalFilter searchPlaceholder="Search payroll batches..." emptyMessage="No payroll batches" />
        )}
      </div>

      {/* Create Payroll Batch */}
      {showCreate && <CreatePayrollDialog open onClose={() => setShowCreate(false)} onSubmit={(d) => createMutation.mutate(d, { onSuccess: () => { toast.success('Payroll batch created'); setShowCreate(false); }, onError: () => toast.error('Failed to create batch') })} isSubmitting={createMutation.isPending} />}

      {/* Confirm Action */}
      {confirmAction && (
        <ConfirmDialog
          open
          onOpenChange={() => setConfirmAction(null)}
          title={`${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)} Batch`}
          description={`Are you sure you want to ${confirmAction.type} batch ${confirmAction.batchId}?`}
          onConfirm={handleConfirm}
          loading={validateMutation.isPending || approveMutation.isPending || processMutation.isPending}
        />
      )}
    </>
  );
}

function CreatePayrollDialog({ open, onClose, onSubmit, isSubmitting }: { open: boolean; onClose: () => void; onSubmit: (d: Partial<PayrollBatch>) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ companyName: '', customerId: 0, debitAccountId: 0, payrollType: 'MONTHLY_SALARY', currency: 'NGN', payPeriodStart: '', payPeriodEnd: '', paymentDate: '' });
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Payroll Batch</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Company Name *</Label><Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customer ID *</Label><Input type="number" value={form.customerId || ''} onChange={(e) => set('customerId', Number(e.target.value))} /></div>
            <div><Label>Debit Account ID *</Label><Input type="number" value={form.debitAccountId || ''} onChange={(e) => set('debitAccountId', Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Payroll Type</Label>
              <Select value={form.payrollType} onValueChange={(v) => set('payrollType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY_SALARY">Monthly Salary</SelectItem>
                  <SelectItem value="BONUS">Bonus</SelectItem>
                  <SelectItem value="THIRTEENTH_MONTH">13th Month</SelectItem>
                  <SelectItem value="LEAVE_ALLOWANCE">Leave Allowance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => set('currency', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Period Start *</Label><Input type="date" value={form.payPeriodStart} onChange={(e) => set('payPeriodStart', e.target.value)} /></div>
            <div><Label>Period End *</Label><Input type="date" value={form.payPeriodEnd} onChange={(e) => set('payPeriodEnd', e.target.value)} /></div>
            <div><Label>Payment Date *</Label><Input type="date" value={form.paymentDate} onChange={(e) => set('paymentDate', e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.companyName || !form.customerId}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
