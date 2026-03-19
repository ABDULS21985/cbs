import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { glApi } from '../../api/glApi';
import type { GlAccount } from '../../api/glApi';
import { FormSection } from '@/components/shared';
import { cn } from '@/lib/utils';

const schema = z.object({
  code: z.string().min(2, 'GL code is required').max(10),
  name: z.string().min(2, 'Account name is required').max(100),
  type: z.enum(['HEADER', 'DETAIL']),
  parentCode: z.string().optional(),
  category: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  currency: z.string().min(3).max(3),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormValues = z.infer<typeof schema>;

interface GlAccountFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentAccount?: GlAccount;
}

const CATEGORIES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

function flattenAccounts(accounts: GlAccount[]): GlAccount[] {
  const result: GlAccount[] = [];
  function walk(items: GlAccount[]) {
    for (const item of items) {
      result.push(item);
      if (item.children) walk(item.children);
    }
  }
  walk(accounts);
  return result;
}

export function GlAccountForm({ open, onClose, onSuccess, parentAccount }: GlAccountFormProps) {
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: glApi.getChartOfAccounts,
    enabled: open,
  });

  const flatAccounts = flattenAccounts(allAccounts);
  const headerAccounts = flatAccounts.filter((a) => a.type === 'HEADER');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      type: 'DETAIL',
      parentCode: parentAccount?.code || '',
      category: parentAccount?.category || 'ASSET',
      currency: 'NGN',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        code: '',
        name: '',
        type: parentAccount ? 'DETAIL' : 'HEADER',
        parentCode: parentAccount?.code || '',
        category: parentAccount?.category || 'ASSET',
        currency: 'NGN',
        status: 'ACTIVE',
      });
    }
  }, [open, parentAccount, reset]);

  const mutation = useMutation({
    mutationFn: glApi.createGlAccount,
    onSuccess: () => {
      toast.success('GL account created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to create GL account');
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">
              {parentAccount ? `Add Account under ${parentAccount.code} — ${parentAccount.name}` : 'Add GL Account'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">GL Code <span className="text-red-500">*</span></label>
                <input
                  {...register('code')}
                  placeholder="e.g. 1101"
                  className={cn('w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring', errors.code && 'border-red-500')}
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Account Type <span className="text-red-500">*</span></label>
                <select {...register('type')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="HEADER">Header</option>
                  <option value="DETAIL">Detail</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Account Name <span className="text-red-500">*</span></label>
              <input
                {...register('name')}
                placeholder="e.g. Cash in Vault"
                className={cn('w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring', errors.name && 'border-red-500')}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Parent Account</label>
              <select
                {...register('parentCode')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— No parent (root account) —</option>
                {headerAccounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category <span className="text-red-500">*</span></label>
                <select {...register('category')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Currency <span className="text-red-500">*</span></label>
                <select {...register('currency')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Status <span className="text-red-500">*</span></label>
              <select {...register('status')} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={mutation.isPending}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
