import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared';
import { userAdminApi, type Role, type CreateRoleRequest } from '../../api/userAdminApi';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Role name required').regex(/^[A-Z0-9_]+$/, 'Uppercase letters, numbers and underscores only'),
  displayName: z.string().min(2, 'Display name required'),
  description: z.string().min(5, 'Description required'),
  permissions: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  role?: Role;
  onSuccess: () => void;
}

const MODULES = ['customers', 'accounts', 'lending', 'payments', 'treasury', 'risk', 'compliance', 'operations', 'reports', 'admin'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

export function RoleForm({ open, onClose, role, onSuccess }: RoleFormProps) {
  const isEdit = !!role;

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => userAdminApi.getPermissions(),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      permissions: [],
    },
  });

  useEffect(() => {
    if (open) {
      if (role) {
        reset({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissions || [],
        });
      } else {
        reset({ name: '', displayName: '', description: '', permissions: [] });
      }
    }
  }, [open, role, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateRoleRequest) => userAdminApi.createRole(data),
    onSuccess: () => { toast.success('Role created successfully'); onSuccess(); },
    onError: () => toast.error('Failed to create role'),
  });

  const updateMutation = useMutation({
    mutationFn: (perms: string[]) => userAdminApi.updateRolePermissions(role!.id, perms),
    onSuccess: () => { toast.success('Role permissions updated'); onSuccess(); },
    onError: () => toast.error('Failed to update role'),
  });

  const selectedPerms = watch('permissions') || [];

  const togglePerm = (permId: string) => {
    if (selectedPerms.includes(permId)) {
      setValue('permissions', selectedPerms.filter(p => p !== permId), { shouldValidate: true });
    } else {
      setValue('permissions', [...selectedPerms, permId], { shouldValidate: true });
    }
  };

  const toggleModule = (mod: string) => {
    const modPerms = ACTIONS.map(a => `${mod}:${a}`).filter(p => allPermissions.find(ap => ap.id === p));
    const allSelected = modPerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setValue('permissions', selectedPerms.filter(p => !modPerms.includes(p)), { shouldValidate: true });
    } else {
      const merged = Array.from(new Set([...selectedPerms, ...modPerms]));
      setValue('permissions', merged, { shouldValidate: true });
    }
  };

  const onSubmit = (values: FormValues) => {
    if (isEdit) {
      updateMutation.mutate(values.permissions);
    } else {
      createMutation.mutate(values as CreateRoleRequest);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const permSet = new Set(selectedPerms);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">{isEdit ? `Edit Role: ${role.displayName}` : 'Create New Role'}</h2>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Info */}
              <FormSection title="Role Details">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Role Name (identifier) <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('name')}
                      disabled={isEdit}
                      placeholder="LOAN_OFFICER"
                      className={cn('w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary', errors.name && 'border-red-500', isEdit && 'opacity-60 cursor-not-allowed bg-muted')}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('displayName')}
                      placeholder="Loan Officer"
                      className={cn('w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary', errors.displayName && 'border-red-500')}
                    />
                    {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('description')}
                      rows={2}
                      placeholder="Describe the role's responsibilities..."
                      className={cn('w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary', errors.description && 'border-red-500')}
                    />
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
                  </div>
                </div>
              </FormSection>

              {/* Permission Matrix */}
              <FormSection title="Permissions" description="Select the operations this role is allowed to perform">
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    <div className="text-xs font-medium text-muted-foreground col-span-1 pl-1">Module</div>
                    {ACTIONS.map(action => (
                      <div key={action} className="text-xs font-medium text-center text-muted-foreground capitalize">{action}</div>
                    ))}
                  </div>
                  {MODULES.map(mod => {
                    const modPerms = ACTIONS.map(a => `${mod}:${a}`);
                    const existingModPerms = modPerms.filter(p => allPermissions.find(ap => ap.id === p));
                    const allSelected = existingModPerms.every(p => permSet.has(p));
                    const someSelected = existingModPerms.some(p => permSet.has(p));
                    return (
                      <div key={mod} className="grid grid-cols-7 gap-1 items-center py-1.5 rounded hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 col-span-1 pl-1">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => toggleModule(mod)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm capitalize font-medium">{mod}</span>
                        </div>
                        {ACTIONS.map(action => {
                          const permId = `${mod}:${action}`;
                          const exists = !!allPermissions.find(p => p.id === permId);
                          return (
                            <div key={action} className="flex justify-center">
                              {exists ? (
                                <input
                                  type="checkbox"
                                  checked={permSet.has(permId)}
                                  onChange={() => togglePerm(permId)}
                                  className="cursor-pointer"
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {selectedPerms.length} permission{selectedPerms.length !== 1 ? 's' : ''} selected
                </div>
              </FormSection>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end px-6 py-4 border-t flex-shrink-0">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Save Permissions' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
