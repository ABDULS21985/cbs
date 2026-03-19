import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Layers } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { VirtualAccountTable } from '../components/virtual/VirtualAccountTable';
import {
  getVirtualAccounts,
  createVirtualAccount,
} from '../api/virtualAccountApi';

const newVASchema = z.object({
  parentAccountNumber: z.string().min(10, 'Account number must be at least 10 digits'),
  customerName: z.string().min(2, 'Customer name is required'),
  pattern: z.string().min(1, 'Matching pattern is required'),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']),
});

type NewVAFormData = z.infer<typeof newVASchema>;

export function VirtualAccountListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['virtual-accounts'],
    queryFn: getVirtualAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createVirtualAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      setShowDialog(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewVAFormData>({
    resolver: zodResolver(newVASchema),
    defaultValues: { currency: 'NGN' },
  });

  const onSubmit = (data: NewVAFormData) => {
    createMutation.mutate({
      parentAccountId: `acc-${Date.now()}`,
      parentAccountNumber: data.parentAccountNumber,
      customerId: `cust-${Date.now()}`,
      customerName: data.customerName,
      pattern: data.pattern,
      currency: data.currency,
    });
  };

  return (
    <div>
      <PageHeader
        title="Virtual Accounts"
        subtitle="Manage virtual account numbers and transaction matching rules"
        actions={
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Virtual Account
          </button>
        }
      />

      <div className="page-container">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-label">Total Virtual Accounts</div>
            <div className="stat-value">{accounts.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value text-green-600">
              {accounts.filter((a) => a.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Matched MTD</div>
            <div className="stat-value">
              {accounts.reduce((s, a) => s + a.matchedMTD, 0).toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unmatched Items</div>
            <div className="stat-value text-red-600">
              {accounts.reduce((s, a) => s + a.unmatchedCount, 0)}
            </div>
          </div>
        </div>

        <VirtualAccountTable
          accounts={accounts}
          onRowClick={(id) => navigate(`/accounts/virtual-accounts/${id}`)}
        />
      </div>

      {/* Create Virtual Account Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDialog(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold">New Virtual Account</h2>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              {/* Parent account number */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Parent Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('parentAccountNumber')}
                  placeholder="10-digit account number"
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.parentAccountNumber && 'border-red-500',
                  )}
                />
                {errors.parentAccountNumber && (
                  <p className="text-xs text-red-600">{errors.parentAccountNumber.message}</p>
                )}
              </div>

              {/* Customer name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('customerName')}
                  placeholder="e.g. Dangote Industries Ltd"
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.customerName && 'border-red-500',
                  )}
                />
                {errors.customerName && (
                  <p className="text-xs text-red-600">{errors.customerName.message}</p>
                )}
              </div>

              {/* Matching pattern */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Matching Pattern (Regex) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('pattern')}
                  placeholder="e.g. ^INV-CUST-\\d+$"
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.pattern && 'border-red-500',
                  )}
                />
                {errors.pattern && (
                  <p className="text-xs text-red-600">{errors.pattern.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Regex pattern used to match incoming payment references to this virtual account.
                </p>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency</label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowDialog(false); reset(); }}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Account
                </button>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-600 text-center">
                  Failed to create virtual account. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
