import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceProvider } from '../../api/providerApi';

const PROVIDER_TYPES = ['KYC_PROVIDER','CREDIT_BUREAU','PAYMENT_GATEWAY','CARD_PROCESSOR','SMS_GATEWAY','EMAIL_SERVICE','SWIFT','MARKET_DATA','FRAUD_SCREENING','AML_SCREENING','DOCUMENT_VERIFICATION','BIOMETRIC','IDENTITY_VERIFICATION','INSURANCE','RATING_AGENCY','CIT_COMPANY','PRINTING_SERVICE'] as const;
const INTEGRATION_METHODS = ['REST_API','SOAP','SFTP','MQ','WEBSOCKET','SDK','BATCH_FILE'] as const;
const AUTH_TYPES = ['API_KEY','OAUTH2','CERTIFICATE','BASIC','NONE'] as const;
const COST_MODELS = ['PER_CALL','MONTHLY_FLAT','TIERED','FREE'] as const;

const schema = z.object({
  providerCode: z.string().min(2),
  providerName: z.string().min(2),
  providerType: z.enum(PROVIDER_TYPES),
  integrationMethod: z.enum(INTEGRATION_METHODS),
  baseUrl: z.string().url(),
  authType: z.enum(AUTH_TYPES),
  slaResponseTimeMs: z.coerce.number().min(0).optional(),
  slaUptimePct: z.coerce.number().min(0).max(100).optional(),
  costModel: z.enum(COST_MODELS),
  costPerCall: z.coerce.number().min(0).optional(),
  primaryContactName: z.string().min(1),
  primaryContactEmail: z.string().email(),
});

type FormData = z.infer<typeof schema>;

interface ProviderRegistrationFormProps {
  onSubmit: (data: Partial<ServiceProvider>) => Promise<void>;
  onCancel: () => void;
}

export function ProviderRegistrationForm({ onSubmit, onCancel }: ProviderRegistrationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { providerType: 'PAYMENT_GATEWAY', integrationMethod: 'REST_API', authType: 'API_KEY', costModel: 'PER_CALL' },
  });
  const handle = async (data: FormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  const fc = (err?: unknown) => cn('w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50', err ? 'border-red-500' : undefined);

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">Code *</label><input {...register('providerCode')} className={fc(errors.providerCode)} />{errors.providerCode && <p className="text-xs text-red-600">{errors.providerCode.message}</p>}</div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Name *</label><input {...register('providerName')} className={fc(errors.providerName)} />{errors.providerName && <p className="text-xs text-red-600">{errors.providerName.message}</p>}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">Type</label><select {...register('providerType')} className={fc()}>{PROVIDER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Integration</label><select {...register('integrationMethod')} className={fc()}>{INTEGRATION_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">Base URL *</label><input {...register('baseUrl')} placeholder="https://api.provider.com" className={fc(errors.baseUrl)} />{errors.baseUrl && <p className="text-xs text-red-600">{errors.baseUrl.message}</p>}</div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Auth Type</label><select {...register('authType')} className={fc()}>{AUTH_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">SLA Response (ms)</label><input type="number" {...register('slaResponseTimeMs')} className={fc()} /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">SLA Uptime %</label><input type="number" step="0.01" {...register('slaUptimePct')} className={fc()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">Cost Model</label><select {...register('costModel')} className={fc()}>{COST_MODELS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Cost/Call</label><input type="number" step="0.01" {...register('costPerCall')} className={fc()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-sm font-medium">Contact *</label><input {...register('primaryContactName')} className={fc(errors.primaryContactName)} /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Email *</label><input {...register('primaryContactEmail')} className={fc(errors.primaryContactEmail)} /></div>
      </div>
      <div className="flex gap-2 pt-4 border-t">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Register
        </button>
      </div>
    </form>
  );
}
