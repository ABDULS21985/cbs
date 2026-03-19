import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Plus, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared';
import { userAdminApi, type CbsUser, type CreateUserRequest } from '../../api/userAdminApi';
import { cn } from '@/lib/utils';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-z0-9._-]+$/, 'Lowercase letters, numbers, dots, underscores and hyphens only'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  department: z.string().min(1, 'Department is required'),
  reportingTo: z.string().optional(),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  mfaRequired: z.boolean(),
  loginHoursFrom: z.string().optional(),
  loginHoursTo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  user?: CbsUser;
  onSuccess: () => void;
}

const BRANCHES = [
  { id: 'br1', name: 'Head Office' },
  { id: 'br2', name: 'Lagos Island' },
  { id: 'br3', name: 'Abuja Central' },
  { id: 'br4', name: 'Port Harcourt' },
  { id: 'br5', name: 'Kano Branch' },
];

export function UserForm({ open, onClose, user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [ipInput, setIpInput] = useState('');
  const [ipRestrictions, setIpRestrictions] = useState<string[]>(user?.ipRestriction || []);

  const { data: roles = [] } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => userAdminApi.getRoles(),
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
      username: '',
      fullName: '',
      email: '',
      phone: '',
      branchId: '',
      department: '',
      reportingTo: '',
      roles: [],
      mfaRequired: false,
      loginHoursFrom: '',
      loginHoursTo: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone || '',
          branchId: user.branchId,
          department: user.department,
          reportingTo: user.reportingTo || '',
          roles: user.roles,
          mfaRequired: user.mfaEnabled,
          loginHoursFrom: user.loginHoursFrom || '',
          loginHoursTo: user.loginHoursTo || '',
        });
        setIpRestrictions(user.ipRestriction || []);
      } else {
        reset({
          username: '',
          fullName: '',
          email: '',
          phone: '',
          branchId: '',
          department: '',
          reportingTo: '',
          roles: [],
          mfaRequired: false,
          loginHoursFrom: '',
          loginHoursTo: '',
        });
        setIpRestrictions([]);
      }
    }
  }, [open, user, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userAdminApi.createUser(data),
    onSuccess: () => { toast.success('User created successfully'); onSuccess(); },
    onError: () => toast.error('Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateUserRequest>) => userAdminApi.updateUser(user!.id, data),
    onSuccess: () => { toast.success('User updated successfully'); onSuccess(); },
    onError: () => toast.error('Failed to update user'),
  });

  const selectedRoles = watch('roles');
  const mfaRequired = watch('mfaRequired');

  const toggleRole = (roleName: string) => {
    const current = selectedRoles || [];
    if (current.includes(roleName)) {
      setValue('roles', current.filter(r => r !== roleName), { shouldValidate: true });
    } else {
      setValue('roles', [...current, roleName], { shouldValidate: true });
    }
  };

  const addIp = () => {
    const ip = ipInput.trim();
    if (ip && !ipRestrictions.includes(ip)) {
      setIpRestrictions(prev => [...prev, ip]);
      setIpInput('');
    }
  };

  const removeIp = (ip: string) => setIpRestrictions(prev => prev.filter(i => i !== ip));

  const onSubmit = (values: FormValues) => {
    const payload: CreateUserRequest = {
      ...values,
      ipRestriction: ipRestrictions.length > 0 ? ipRestrictions : undefined,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">{isEdit ? 'Edit User' : 'Create New User'}</h2>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Personal */}
              <FormSection title="Personal Information" description="Basic identity and contact details">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Username" error={errors.username?.message} required>
                    <input
                      {...register('username')}
                      disabled={isEdit}
                      placeholder="john.doe"
                      className={inputCls(!!errors.username, isEdit)}
                    />
                  </Field>
                  <Field label="Full Name" error={errors.fullName?.message} required>
                    <input {...register('fullName')} placeholder="John Doe" className={inputCls(!!errors.fullName)} />
                  </Field>
                  <Field label="Email Address" error={errors.email?.message} required>
                    <input {...register('email')} type="email" placeholder="john.doe@bank.com" className={inputCls(!!errors.email)} />
                  </Field>
                  <Field label="Phone Number" error={errors.phone?.message}>
                    <input {...register('phone')} placeholder="+234 800 000 0000" className={inputCls(false)} />
                  </Field>
                </div>
              </FormSection>

              {/* Organization */}
              <FormSection title="Organization" description="Branch, department and reporting structure">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Branch" error={errors.branchId?.message} required>
                    <select {...register('branchId')} className={inputCls(!!errors.branchId)}>
                      <option value="">Select branch...</option>
                      {BRANCHES.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Department" error={errors.department?.message} required>
                    <input {...register('department')} placeholder="e.g. Retail Banking" className={inputCls(!!errors.department)} />
                  </Field>
                  <Field label="Reporting To" error={errors.reportingTo?.message}>
                    <input {...register('reportingTo')} placeholder="Manager's name or title" className={inputCls(false)} />
                  </Field>
                </div>
              </FormSection>

              {/* Access */}
              <FormSection title="Access Control" description="Roles, IP restrictions and login hours">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Roles <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map(role => (
                        <label key={role.id} className={cn('flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors', selectedRoles?.includes(role.name) && 'border-primary bg-primary/5')}>
                          <input
                            type="checkbox"
                            checked={selectedRoles?.includes(role.name) || false}
                            onChange={() => toggleRole(role.name)}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="text-sm font-medium">{role.displayName}</div>
                            <div className="text-xs text-muted-foreground">{role.description.slice(0, 50)}...</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.roles && <p className="text-xs text-red-500 mt-1">{errors.roles.message}</p>}
                  </div>

                  {/* IP Restriction */}
                  <div>
                    <label className="block text-sm font-medium mb-2">IP Restrictions</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={ipInput}
                        onChange={e => setIpInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIp(); } }}
                        placeholder="192.168.1.0/24 — press Enter to add"
                        className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button type="button" onClick={addIp} className="px-3 py-2 rounded-lg border hover:bg-muted transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {ipRestrictions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ipRestrictions.map(ip => (
                          <span key={ip} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-mono">
                            {ip}
                            <button type="button" onClick={() => removeIp(ip)} className="hover:text-red-500 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Leave empty to allow login from any IP</p>
                  </div>

                  {/* Login Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Login Hours From" error={errors.loginHoursFrom?.message}>
                      <input {...register('loginHoursFrom')} type="time" className={inputCls(false)} />
                    </Field>
                    <Field label="Login Hours To" error={errors.loginHoursTo?.message}>
                      <input {...register('loginHoursTo')} type="time" className={inputCls(false)} />
                    </Field>
                  </div>
                </div>
              </FormSection>

              {/* Security */}
              <FormSection title="Security Settings" description="Authentication and security configuration">
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">Require Multi-Factor Authentication</div>
                      <div className="text-xs text-muted-foreground">User must set up MFA on first login</div>
                    </div>
                    <div
                      onClick={() => setValue('mfaRequired', !mfaRequired)}
                      className={cn('relative inline-flex w-10 h-5 rounded-full transition-colors cursor-pointer', mfaRequired ? 'bg-primary' : 'bg-muted')}
                    >
                      <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', mfaRequired && 'translate-x-5')} />
                    </div>
                  </label>

                  {!isEdit && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        A temporary password will be auto-generated and sent to the user's email upon account creation. The user will be required to change it on first login.
                      </p>
                    </div>
                  )}
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
                {isEdit ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function inputCls(hasError: boolean, disabled = false) {
  return cn(
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
    hasError && 'border-red-500',
    disabled && 'opacity-60 cursor-not-allowed bg-muted',
  );
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
