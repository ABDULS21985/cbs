import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { FormSection } from '@/components/shared';
import type { CustomerAgreement, CreateCustomerAgreementPayload } from '../types/agreementExt';
import { cn } from '@/lib/utils';

const AGREEMENT_TYPES = [
  { value: 'MASTER_SERVICE', label: 'Master Service' },
  { value: 'PRODUCT_SPECIFIC', label: 'Product Specific' },
  { value: 'FEE_SCHEDULE', label: 'Fee Schedule' },
  { value: 'LIMIT_AGREEMENT', label: 'Limit Agreement' },
  { value: 'CHANNEL_ACCESS', label: 'Channel Access' },
  { value: 'DATA_SHARING', label: 'Data Sharing' },
  { value: 'PRIVACY_CONSENT', label: 'Privacy Consent' },
  { value: 'POWER_OF_ATTORNEY', label: 'Power of Attorney' },
  { value: 'GUARANTEE', label: 'Guarantee' },
  { value: 'COLLATERAL', label: 'Collateral' },
  { value: 'NDA', label: 'NDA' },
];

interface AgreementFormProps {
  initialData?: Partial<CustomerAgreement>;
  onSubmit: (data: CreateCustomerAgreementPayload) => void;
  isLoading: boolean;
  submitLabel?: string;
}

interface FormErrors {
  title?: string;
  customerId?: string;
  agreementType?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export function AgreementForm({ initialData, onSubmit, isLoading, submitLabel = 'Submit' }: AgreementFormProps) {
  const [form, setForm] = useState<CreateCustomerAgreementPayload>({
    agreementType: initialData?.agreementType || 'MASTER_SERVICE',
    title: initialData?.title || '',
    description: initialData?.description || '',
    customerId: initialData?.customerId || 0,
    documentRef: initialData?.documentRef || '',
    effectiveFrom: initialData?.effectiveFrom?.split('T')[0] || '',
    effectiveTo: initialData?.effectiveTo?.split('T')[0] || '',
    autoRenew: initialData?.autoRenew || false,
    renewalTermMonths: initialData?.renewalTermMonths || 12,
    noticePeriodDays: initialData?.noticePeriodDays || 30,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        agreementType: initialData.agreementType || 'MASTER_SERVICE',
        title: initialData.title || '',
        description: initialData.description || '',
        customerId: initialData.customerId || 0,
        documentRef: initialData.documentRef || '',
        effectiveFrom: initialData.effectiveFrom?.split('T')[0] || '',
        effectiveTo: initialData.effectiveTo?.split('T')[0] || '',
        autoRenew: initialData.autoRenew || false,
        renewalTermMonths: initialData.renewalTermMonths || 12,
        noticePeriodDays: initialData.noticePeriodDays || 30,
      });
    }
  }, [initialData]);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.customerId || form.customerId <= 0) errs.customerId = 'Customer ID is required';
    if (!form.agreementType) errs.agreementType = 'Agreement type is required';
    if (!form.effectiveFrom) errs.effectiveFrom = 'Effective from date is required';
    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
      errs.effectiveTo = 'Effective to must be after effective from';
    }
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const handleChange = <K extends keyof CreateCustomerAgreementPayload>(
    field: K,
    value: CreateCustomerAgreementPayload[K],
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ title: true, customerId: true, agreementType: true, effectiveFrom: true, effectiveTo: true });
    if (Object.keys(errs).length > 0) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Agreement Details" description="Core agreement information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Agreement Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.agreementType}
              onChange={e => handleChange('agreementType', e.target.value)}
              onBlur={() => handleBlur('agreementType')}
              className={inputCls(!!errors.agreementType && touched.agreementType)}
            >
              {AGREEMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {touched.agreementType && errors.agreementType && (
              <p className="text-xs text-red-500 mt-1">{errors.agreementType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Agreement title"
              className={inputCls(!!errors.title && touched.title)}
            />
            {touched.title && errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Describe the agreement..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Customer ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.customerId || ''}
              onChange={e => handleChange('customerId', Number(e.target.value))}
              onBlur={() => handleBlur('customerId')}
              placeholder="Enter customer ID"
              className={inputCls(!!errors.customerId && touched.customerId)}
            />
            {touched.customerId && errors.customerId && (
              <p className="text-xs text-red-500 mt-1">{errors.customerId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Document Reference</label>
            <input
              type="text"
              value={form.documentRef || ''}
              onChange={e => handleChange('documentRef', e.target.value)}
              placeholder="Optional reference number"
              className={inputCls(false)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Dates & Renewal" description="Effective dates and auto-renewal settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Effective From <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.effectiveFrom}
              onChange={e => handleChange('effectiveFrom', e.target.value)}
              onBlur={() => handleBlur('effectiveFrom')}
              className={inputCls(!!errors.effectiveFrom && touched.effectiveFrom)}
            />
            {touched.effectiveFrom && errors.effectiveFrom && (
              <p className="text-xs text-red-500 mt-1">{errors.effectiveFrom}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Effective To</label>
            <input
              type="date"
              value={form.effectiveTo || ''}
              onChange={e => handleChange('effectiveTo', e.target.value)}
              onBlur={() => handleBlur('effectiveTo')}
              className={inputCls(!!errors.effectiveTo && touched.effectiveTo)}
            />
            {touched.effectiveTo && errors.effectiveTo && (
              <p className="text-xs text-red-500 mt-1">{errors.effectiveTo}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={form.autoRenew}
                onChange={e => handleChange('autoRenew', e.target.checked)}
              />
              <div>
                <span className="text-sm font-medium">Auto-Renew</span>
                <span className="block text-xs text-muted-foreground">Automatically renew when term expires</span>
              </div>
            </label>
          </div>

          {form.autoRenew && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Renewal Term (months)</label>
              <input
                type="number"
                value={form.renewalTermMonths || ''}
                onChange={e => handleChange('renewalTermMonths', Number(e.target.value))}
                min={1}
                placeholder="12"
                className={inputCls(false)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Notice Period (days)</label>
            <input
              type="number"
              value={form.noticePeriodDays || ''}
              onChange={e => handleChange('noticePeriodDays', Number(e.target.value))}
              min={0}
              placeholder="30"
              className={inputCls(false)}
            />
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
    hasError && 'border-red-500',
  );
}
