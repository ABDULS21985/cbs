import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProviderType, IntegrationType, CostModel } from '../../api/providerApi';

const schema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(20, 'Code too long').regex(/^[A-Z0-9-_]+$/, 'Code must be uppercase letters, numbers, hyphens or underscores'),
  name: z.string().min(3, 'Name required').max(100),
  type: z.enum(['IDENTITY', 'PAYMENT_SWITCH', 'CREDIT_BUREAU', 'SMS', 'EMAIL', 'PUSH', 'INSURANCE', 'REMITTANCE', 'USSD', 'CARD_SCHEME'] as [ProviderType, ...ProviderType[]]),
  integration: z.enum(['REST', 'SOAP', 'ISO8583', 'SFTP', 'SDK'] as [IntegrationType, ...IntegrationType[]]),
  description: z.string().min(10, 'Provide a description of at least 10 characters'),
  baseUrl: z.string().min(4, 'Base URL is required'),
  slaUptimeTarget: z.number({ invalid_type_error: 'Enter a number' }).min(90).max(100),
  slaResponseTarget: z.number({ invalid_type_error: 'Enter a number' }).min(10).max(10000),
  costModel: z.enum(['PER_CALL', 'MONTHLY_FLAT', 'TIERED', 'REVENUE_SHARE'] as [CostModel, ...CostModel[]]),
  budget: z.number({ invalid_type_error: 'Enter a number' }).min(0),
});

type FormData = z.infer<typeof schema>;

interface ProviderRegistrationFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: 'IDENTITY', label: 'Identity (BVN/NIN)' },
  { value: 'PAYMENT_SWITCH', label: 'Payment Switch' },
  { value: 'CREDIT_BUREAU', label: 'Credit Bureau' },
  { value: 'SMS', label: 'SMS Gateway' },
  { value: 'EMAIL', label: 'Email Service' },
  { value: 'PUSH', label: 'Push Notifications' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'REMITTANCE', label: 'Remittance' },
  { value: 'USSD', label: 'USSD Channel' },
  { value: 'CARD_SCHEME', label: 'Card Scheme' },
];

const INTEGRATION_TYPES: { value: IntegrationType; label: string }[] = [
  { value: 'REST', label: 'REST API' },
  { value: 'SOAP', label: 'SOAP / WSDL' },
  { value: 'ISO8583', label: 'ISO 8583' },
  { value: 'SFTP', label: 'SFTP File Transfer' },
  { value: 'SDK', label: 'SDK / Library' },
];

const COST_MODELS: { value: CostModel; label: string; desc: string }[] = [
  { value: 'PER_CALL', label: 'Per Call', desc: 'Charged per API call' },
  { value: 'MONTHLY_FLAT', label: 'Monthly Flat', desc: 'Fixed monthly fee' },
  { value: 'TIERED', label: 'Tiered', desc: 'Volume-based tiers' },
  { value: 'REVENUE_SHARE', label: 'Revenue Share', desc: 'Percentage of revenue' },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>;
}

export function ProviderRegistrationForm({ onSubmit, onCancel }: ProviderRegistrationFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      slaUptimeTarget: 99.9,
      slaResponseTarget: 300,
      budget: 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Code + Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Provider Code <span className="text-red-500">*</span>
          </label>
          <input
            {...register('code')}
            placeholder="e.g. NIBSS-BVN"
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase',
              errors.code ? 'border-red-400' : 'border-border',
            )}
          />
          <FieldError message={errors.code?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Provider Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            placeholder="e.g. NIBSS BVN Service"
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.name ? 'border-red-400' : 'border-border',
            )}
          />
          <FieldError message={errors.name?.message} />
        </div>
      </div>

      {/* Type + Integration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Provider Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type')}
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.type ? 'border-red-400' : 'border-border',
            )}
          >
            <option value="">Select type…</option>
            {PROVIDER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <FieldError message={errors.type?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Integration Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('integration')}
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.integration ? 'border-red-400' : 'border-border',
            )}
          >
            <option value="">Select integration…</option>
            {INTEGRATION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <FieldError message={errors.integration?.message} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Describe the service and its role in the system…"
          className={cn(
            'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none',
            errors.description ? 'border-red-400' : 'border-border',
          )}
        />
        <FieldError message={errors.description?.message} />
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Base URL <span className="text-red-500">*</span>
        </label>
        <input
          {...register('baseUrl')}
          placeholder="https://api.provider.com/v1"
          className={cn(
            'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono',
            errors.baseUrl ? 'border-red-400' : 'border-border',
          )}
        />
        <FieldError message={errors.baseUrl?.message} />
      </div>

      {/* SLA Targets */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            SLA Uptime Target (%) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('slaUptimeTarget', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="90"
            max="100"
            placeholder="99.9"
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.slaUptimeTarget ? 'border-red-400' : 'border-border',
            )}
          />
          <FieldError message={errors.slaUptimeTarget?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            SLA Response Target (ms) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('slaResponseTarget', { valueAsNumber: true })}
            type="number"
            min="10"
            max="10000"
            placeholder="300"
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.slaResponseTarget ? 'border-red-400' : 'border-border',
            )}
          />
          <FieldError message={errors.slaResponseTarget?.message} />
        </div>
      </div>

      {/* Cost Model */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Cost Model <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {COST_MODELS.map(cm => (
            <label key={cm.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                {...register('costModel')}
                value={cm.value}
                className="mt-1 h-4 w-4 text-primary border-border"
              />
              <div>
                <p className="text-sm font-medium">{cm.label}</p>
                <p className="text-xs text-muted-foreground">{cm.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <FieldError message={errors.costModel?.message} />
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Monthly Budget (₦)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
          <input
            {...register('budget', { valueAsNumber: true })}
            type="number"
            min="0"
            placeholder="0"
            className={cn(
              'w-full border rounded-lg pl-7 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.budget ? 'border-red-400' : 'border-border',
            )}
          />
        </div>
        <FieldError message={errors.budget?.message} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Register Provider
        </button>
      </div>
    </form>
  );
}
