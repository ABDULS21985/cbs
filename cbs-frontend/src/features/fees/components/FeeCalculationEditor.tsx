import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Edit2, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSection } from '@/components/shared';
import { TierTableEditor } from './TierTableEditor';
import type { FeeDefinition, FeeCalcType, FeeTier } from '../api/feeApi';

// ─── Schema ───────────────────────────────────────────────────────────────────

const feeSchema = z.object({
  code: z.string().min(1, 'Fee code is required').max(30, 'Max 30 characters'),
  name: z.string().min(2, 'Fee name is required'),
  category: z.enum([
    'ACCOUNT_MAINTENANCE', 'TRANSACTION', 'CARD', 'LOAN_PROCESSING',
    'STATEMENT', 'CHEQUE', 'SWIFT', 'ATM', 'POS', 'ONLINE',
    'PENALTY', 'COMMISSION', 'SERVICE_CHARGE', 'OTHER',
  ]),
  description: z.string().optional(),
  calcType: z.enum(['FLAT', 'PERCENTAGE', 'TIERED', 'SLAB', 'MIN_OF', 'MAX_OF']),
  flatAmount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  minFee: z.number().min(0).optional(),
  maxFee: z.number().min(0).optional(),
  onAmount: z.enum(['DEBIT', 'CREDIT', 'BALANCE']).optional(),
  vatApplicable: z.boolean(),
  vatRate: z.number().min(0).max(100).optional(),
  schedule: z.enum(['PER_TRANSACTION', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
  waiverAuthority: z.enum(['OFFICER', 'MANAGER', 'ADMIN']),
  glIncomeAccount: z.string().min(1, 'GL Income Account is required').regex(/^\d{6,12}$/, 'Must be 6-12 digits'),
  glReceivableAccount: z.string().min(1, 'GL Receivable Account is required').regex(/^\d{6,12}$/, 'Must be 6-12 digits'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  // ── Additional backend fields ──
  triggerEvent: z.string().max(50).optional(),
  currencyCode: z.string().max(3).optional(),
  applicableChannels: z.string().optional(),
  applicableCustomerTypes: z.string().optional(),
  taxCode: z.string().max(20).optional(),
  waivable: z.boolean().optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

type FeeFormValues = z.infer<typeof feeSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeeCalculationEditorProps {
  initialData?: FeeDefinition;
  mode: 'create' | 'edit' | 'view';
  onSubmit: (data: Partial<FeeDefinition>) => void;
  isSubmitting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const labelCls = 'block text-sm font-medium mb-1';
const inputCls = (disabled: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    disabled && 'bg-muted cursor-not-allowed opacity-70',
  );
const selectCls = (disabled: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    disabled && 'bg-muted cursor-not-allowed opacity-70',
  );
const errorCls = 'mt-1 text-xs text-destructive';

const CATEGORY_OPTIONS = [
  { value: 'ACCOUNT_MAINTENANCE', label: 'Account Maintenance' },
  { value: 'TRANSACTION', label: 'Transaction' },
  { value: 'CARD', label: 'Card' },
  { value: 'LOAN_PROCESSING', label: 'Loan Processing' },
  { value: 'STATEMENT', label: 'Statement' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'SWIFT', label: 'SWIFT' },
  { value: 'ATM', label: 'ATM' },
  { value: 'POS', label: 'POS' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'PENALTY', label: 'Penalty' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'SERVICE_CHARGE', label: 'Service Charge' },
  { value: 'OTHER', label: 'Other' },
];

const CALC_TYPE_OPTIONS = [
  { value: 'FLAT', label: 'Flat Amount', desc: 'Fixed fee regardless of transaction amount' },
  { value: 'PERCENTAGE', label: 'Percentage', desc: 'Calculated as % of transaction amount' },
  { value: 'TIERED', label: 'Tiered Rate', desc: 'Different % rates per amount band' },
  { value: 'SLAB', label: 'Slab Fee', desc: 'Fixed fee per amount band' },
  { value: 'MIN_OF', label: 'Minimum Of', desc: 'Lesser of flat amount and percentage calculation' },
  { value: 'MAX_OF', label: 'Maximum Of', desc: 'Greater of flat amount and percentage calculation' },
];

const SCHEDULE_OPTIONS = [
  { value: 'PER_TRANSACTION', label: 'Per Transaction' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
];

const WAIVER_OPTIONS = [
  { value: 'OFFICER', label: 'Bank Officer' },
  { value: 'MANAGER', label: 'Branch Manager' },
  { value: 'ADMIN', label: 'System Administrator' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function FeeCalculationEditor({ initialData, mode: initialMode, onSubmit, isSubmitting }: FeeCalculationEditorProps) {
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>(initialMode);
  const [tiers, setTiers] = useState<FeeTier[]>(initialData?.tiers || []);
  const [products, setProducts] = useState<string[]>(initialData?.applicableProducts || []);
  const [productInput, setProductInput] = useState('');

  const isReadOnly = mode === 'view';

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      category: initialData?.category || 'ACCOUNT_MAINTENANCE',
      description: initialData?.description || '',
      calcType: initialData?.calcType || 'FLAT',
      flatAmount: initialData?.flatAmount,
      percentage: initialData?.percentage,
      minFee: initialData?.minFee,
      maxFee: initialData?.maxFee,
      onAmount: initialData?.onAmount,
      vatApplicable: initialData?.vatApplicable ?? false,
      vatRate: initialData?.vatRate ?? 7.5,
      schedule: initialData?.schedule || 'PER_TRANSACTION',
      waiverAuthority: initialData?.waiverAuthority || 'OFFICER',
      glIncomeAccount: initialData?.glIncomeAccount || '',
      glReceivableAccount: initialData?.glReceivableAccount || '',
      status: initialData?.status || 'ACTIVE',
      triggerEvent: initialData?.triggerEvent || '',
      currencyCode: initialData?.currencyCode || 'NGN',
      applicableChannels: initialData?.applicableChannels || 'ALL',
      applicableCustomerTypes: initialData?.applicableCustomerTypes || 'ALL',
      taxCode: initialData?.taxCode || '',
      waivable: initialData?.waivable ?? true,
      effectiveFrom: initialData?.effectiveFrom || '',
      effectiveTo: initialData?.effectiveTo || '',
    },
  });

  const calcType = watch('calcType') as FeeCalcType;
  const vatApplicable = watch('vatApplicable');

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code,
        name: initialData.name,
        category: initialData.category,
        description: initialData.description,
        calcType: initialData.calcType,
        flatAmount: initialData.flatAmount,
        percentage: initialData.percentage,
        minFee: initialData.minFee,
        maxFee: initialData.maxFee,
        onAmount: initialData.onAmount,
        vatApplicable: initialData.vatApplicable,
        vatRate: initialData.vatRate,
        schedule: initialData.schedule,
        waiverAuthority: initialData.waiverAuthority,
        glIncomeAccount: initialData.glIncomeAccount,
        glReceivableAccount: initialData.glReceivableAccount,
        status: initialData.status,
        triggerEvent: initialData.triggerEvent || '',
        currencyCode: initialData.currencyCode || 'NGN',
        applicableChannels: initialData.applicableChannels || 'ALL',
        applicableCustomerTypes: initialData.applicableCustomerTypes || 'ALL',
        taxCode: initialData.taxCode || '',
        waivable: initialData.waivable ?? true,
        effectiveFrom: initialData.effectiveFrom || '',
        effectiveTo: initialData.effectiveTo || '',
      });
      setTiers(initialData.tiers || []);
      setProducts(initialData.applicableProducts || []);
    }
  }, [initialData, reset]);

  const handleFormSubmit = (values: FeeFormValues) => {
    onSubmit({ ...values, tiers, applicableProducts: products });
  };

  const addProduct = () => {
    const trimmed = productInput.trim().toUpperCase();
    if (trimmed && !products.includes(trimmed)) {
      setProducts([...products, trimmed]);
      setProductInput('');
    }
  };

  const removeProduct = (code: string) => {
    setProducts(products.filter((p) => p !== code));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* View/Edit toggle */}
      {initialMode === 'view' && (
        <div className="flex justify-end">
          {mode === 'view' ? (
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Definition
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('view')}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Basic Information */}
      <FormSection title="Basic Information" description="Fee identification and categorisation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fee Code *</label>
            <input
              {...register('code')}
              disabled={isReadOnly || mode === 'edit'}
              placeholder="e.g. ACC-MAINT-001"
              className={inputCls(isReadOnly || mode === 'edit')}
            />
            {errors.code && <p className={errorCls}>{errors.code.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Fee Name *</label>
            <input
              {...register('name')}
              disabled={isReadOnly}
              placeholder="e.g. Monthly Account Maintenance"
              className={inputCls(isReadOnly)}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select {...register('category')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status *</label>
            <select {...register('status')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              {...register('description')}
              disabled={isReadOnly}
              rows={2}
              placeholder="Brief description of this fee..."
              className={cn(inputCls(isReadOnly), 'resize-none')}
            />
          </div>
          <div>
            <label className={labelCls}>Trigger Event</label>
            <input
              {...register('triggerEvent')}
              disabled={isReadOnly}
              placeholder="e.g. ATM_WITHDRAWAL"
              className={inputCls(isReadOnly)}
            />
          </div>
          <div>
            <label className={labelCls}>Currency Code</label>
            <select {...register('currencyCode')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>
      </FormSection>

      {/* Calculation Type */}
      <FormSection title="Calculation Method" description="How this fee is computed">
        <div className="space-y-4">
          {/* Calc type selector */}
          <div>
            <label className={labelCls}>Calculation Type *</label>
            {isReadOnly ? (
              <p className="text-sm font-medium py-2">
                {CALC_TYPE_OPTIONS.find((o) => o.value === calcType)?.label}
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Fee calculation type">
                {CALC_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'relative flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors',
                      calcType === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    <Controller
                      name="calcType"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="radio"
                          className="sr-only"
                          value={opt.value}
                          checked={field.value === opt.value}
                          onChange={() => field.onChange(opt.value)}
                        />
                      )}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* FLAT fields */}
          {calcType === 'FLAT' && (
            <div className="max-w-xs">
              <label className={labelCls}>Flat Amount (₦) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                {...register('flatAmount', { valueAsNumber: true })}
                disabled={isReadOnly}
                placeholder="500"
                className={inputCls(isReadOnly)}
              />
              {errors.flatAmount && <p className={errorCls}>{errors.flatAmount.message}</p>}
            </div>
          )}

          {/* PERCENTAGE fields */}
          {calcType === 'PERCENTAGE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Rate (%) *</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...register('percentage', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="1.5"
                  className={inputCls(isReadOnly)}
                />
                {errors.percentage && <p className={errorCls}>{errors.percentage.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Apply On</label>
                <select {...register('onAmount')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
                  <option value="DEBIT">Debit Amount</option>
                  <option value="CREDIT">Credit Amount</option>
                  <option value="BALANCE">Account Balance</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Minimum Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('minFee', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="0"
                  className={inputCls(isReadOnly)}
                />
              </div>
              <div>
                <label className={labelCls}>Maximum Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('maxFee', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="No limit"
                  className={inputCls(isReadOnly)}
                />
              </div>
            </div>
          )}

          {/* TIERED fields */}
          {calcType === 'TIERED' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Apply On</label>
                  <select {...register('onAmount')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
                    <option value="DEBIT">Debit Amount</option>
                    <option value="CREDIT">Credit Amount</option>
                    <option value="BALANCE">Account Balance</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Minimum Fee (₦)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    {...register('minFee', { valueAsNumber: true })}
                    disabled={isReadOnly}
                    className={inputCls(isReadOnly)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Maximum Fee (₦)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    {...register('maxFee', { valueAsNumber: true })}
                    disabled={isReadOnly}
                    className={inputCls(isReadOnly)}
                  />
                </div>
              </div>
              <TierTableEditor tiers={tiers} onChange={setTiers} type="TIERED" readOnly={isReadOnly} />
            </div>
          )}

          {/* SLAB fields */}
          {calcType === 'SLAB' && (
            <TierTableEditor tiers={tiers} onChange={setTiers} type="SLAB" readOnly={isReadOnly} />
          )}

          {/* MIN_OF / MAX_OF fields */}
          {(calcType === 'MIN_OF' || calcType === 'MAX_OF') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Flat Amount (₦) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('flatAmount', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="500"
                  className={inputCls(isReadOnly)}
                />
                {errors.flatAmount && <p className={errorCls}>{errors.flatAmount.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Rate (%) *</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...register('percentage', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="1.5"
                  className={inputCls(isReadOnly)}
                />
                {errors.percentage && <p className={errorCls}>{errors.percentage.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Apply On</label>
                <select {...register('onAmount')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
                  <option value="DEBIT">Debit Amount</option>
                  <option value="CREDIT">Credit Amount</option>
                  <option value="BALANCE">Account Balance</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Minimum Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('minFee', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="0"
                  className={inputCls(isReadOnly)}
                />
              </div>
              <div>
                <label className={labelCls}>Maximum Fee (₦)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  {...register('maxFee', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="No limit"
                  className={inputCls(isReadOnly)}
                />
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* VAT */}
      <FormSection title="VAT Configuration" description="Value Added Tax settings">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Controller
              name="vatApplicable"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && field.onChange(!field.value)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    field.value ? 'bg-primary' : 'bg-input',
                    isReadOnly && 'opacity-70 cursor-not-allowed',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
                      field.value ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              )}
            />
            <span className="text-sm font-medium">VAT Applicable</span>
          </label>

          {vatApplicable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className={labelCls}>VAT Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...register('vatRate', { valueAsNumber: true })}
                  disabled={isReadOnly}
                  placeholder="7.5"
                  className={inputCls(isReadOnly)}
                />
              </div>
              <div>
                <label className={labelCls}>Tax Code</label>
                <input
                  {...register('taxCode')}
                  disabled={isReadOnly}
                  placeholder="e.g. VAT-001"
                  className={inputCls(isReadOnly)}
                />
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* Applicability */}
      <FormSection title="Applicability" description="Channel, customer type, and date restrictions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Applicable Channels</label>
            <input
              {...register('applicableChannels')}
              disabled={isReadOnly}
              placeholder="ALL or comma-separated: MOBILE,WEB,ATM"
              className={inputCls(isReadOnly)}
            />
          </div>
          <div>
            <label className={labelCls}>Applicable Customer Types</label>
            <input
              {...register('applicableCustomerTypes')}
              disabled={isReadOnly}
              placeholder="ALL or comma-separated: INDIVIDUAL,CORPORATE"
              className={inputCls(isReadOnly)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <Controller
                name="waivable"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    disabled={isReadOnly}
                    onClick={() => !isReadOnly && field.onChange(!field.value)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      field.value ? 'bg-primary' : 'bg-input',
                      isReadOnly && 'opacity-70 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
                        field.value ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                )}
              />
              <span className="text-sm font-medium">Waivable</span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Effective From</label>
            <input
              type="date"
              {...register('effectiveFrom')}
              disabled={isReadOnly}
              className={inputCls(isReadOnly)}
            />
          </div>
          <div>
            <label className={labelCls}>Effective To</label>
            <input
              type="date"
              {...register('effectiveTo')}
              disabled={isReadOnly}
              className={inputCls(isReadOnly)}
            />
          </div>
        </div>
      </FormSection>

      {/* Schedule & Waiver */}
      <FormSection title="Billing Schedule & Waiver Authority">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fee Schedule *</label>
            <select {...register('schedule')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
              {SCHEDULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Waiver Authority *</label>
            <select {...register('waiverAuthority')} disabled={isReadOnly} className={selectCls(isReadOnly)}>
              {WAIVER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      {/* GL Accounts */}
      <FormSection title="GL Account Mapping" description="General Ledger accounts for posting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="glIncomeAccount" className={labelCls}>GL Income Account *</label>
            <input
              id="glIncomeAccount"
              {...register('glIncomeAccount')}
              disabled={isReadOnly}
              placeholder="e.g. 4100001"
              aria-required="true"
              aria-describedby={errors.glIncomeAccount ? 'gl-income-error' : 'gl-income-hint'}
              aria-invalid={!!errors.glIncomeAccount}
              className={inputCls(isReadOnly)}
            />
            <p id="gl-income-hint" className="text-xs text-muted-foreground mt-0.5">Fee Income — 6-12 digits only</p>
            {errors.glIncomeAccount && <p id="gl-income-error" className={errorCls} role="alert">{errors.glIncomeAccount.message}</p>}
          </div>
          <div>
            <label htmlFor="glReceivableAccount" className={labelCls}>GL Receivable Account *</label>
            <input
              id="glReceivableAccount"
              {...register('glReceivableAccount')}
              disabled={isReadOnly}
              placeholder="e.g. 1300001"
              aria-required="true"
              aria-describedby={errors.glReceivableAccount ? 'gl-recv-error' : 'gl-recv-hint'}
              aria-invalid={!!errors.glReceivableAccount}
              className={inputCls(isReadOnly)}
            />
            <p id="gl-recv-hint" className="text-xs text-muted-foreground mt-0.5">Customer Account / Receivable — 6-12 digits only</p>
            {errors.glReceivableAccount && <p id="gl-recv-error" className={errorCls} role="alert">{errors.glReceivableAccount.message}</p>}
          </div>
        </div>
      </FormSection>

      {/* Applicable Products */}
      <FormSection title="Applicable Products" description="Product codes this fee applies to">
        <div className="space-y-2">
          {!isReadOnly && (
            <div className="flex gap-2">
              <input
                type="text"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addProduct();
                  }
                }}
                placeholder="Enter product code (e.g. SAVINGS_CLASSIC)"
                className={cn(inputCls(false), 'flex-1')}
              />
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {products.length === 0 && (
              <span className="text-sm text-muted-foreground">No products assigned</span>
            )}
            {products.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {code}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeProduct(code)}
                    className="hover:text-blue-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </FormSection>

      {/* Submit button for create mode */}
      {mode === 'create' && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Create Fee Definition
          </button>
        </div>
      )}
    </form>
  );
}
