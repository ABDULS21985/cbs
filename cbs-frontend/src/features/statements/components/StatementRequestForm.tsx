import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Award, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { FormSection } from '@/components/shared/FormSection';
import type { StatementFormat, StatementType } from '../api/statementApi';

interface AccountOption {
  id: string;
  label: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  statementType: z.enum(['FULL', 'MINI', 'INTEREST_CERTIFICATE'] as const),
  format: z.enum(['PDF', 'CSV', 'EXCEL'] as const),
  dateRange: z.object({
    from: z.date({ required_error: 'Start date required' }),
    to: z.date({ required_error: 'End date required' }),
  }),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StatementRequestFormProps {
  onGenerate: (params: {
    accountId: string;
    from: string;
    to: string;
    type: StatementType;
    format: StatementFormat;
  }) => void;
  onCertificate: (accountId: string) => void;
  onConfirmation: (accountId: string, purpose: string) => void;
  accountId?: string;
  isGenerating?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATEMENT_TYPES: { value: StatementType; label: string; description: string }[] = [
  { value: 'FULL', label: 'Full Statement', description: 'Complete transaction history for period' },
  { value: 'MINI', label: 'Mini Statement', description: 'Last 10 transactions only' },
  { value: 'INTEREST_CERTIFICATE', label: 'Interest Certificate', description: 'Interest earned for the period' },
];

const FORMATS: { value: StatementFormat; label: string }[] = [
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV' },
  { value: 'EXCEL', label: 'Excel' },
];

const CONFIRMATION_PURPOSES = [
  { value: 'EMPLOYER_VERIFICATION', label: 'Employer Verification' },
  { value: 'VISA_APPLICATION', label: 'Visa Application' },
  { value: 'VENDOR_ONBOARDING', label: 'Vendor Onboarding' },
  { value: 'LOAN_APPLICATION', label: 'Loan Application' },
  { value: 'OTHER', label: 'Other' },
];


// ─── Component ────────────────────────────────────────────────────────────────

export function StatementRequestForm({
  onGenerate,
  onCertificate,
  onConfirmation,
  accountId,
  isGenerating = false,
}: StatementRequestFormProps) {
  const [selectedPurpose, setSelectedPurpose] = useState('EMPLOYER_VERIFICATION');

  const { data: accounts = [] } = useQuery({
    queryKey: ['statement-accounts'],
    queryFn: () => apiGet<AccountOption[]>('/api/v1/accounts/selector').catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: accountId ?? '',
      statementType: 'FULL',
      format: 'PDF',
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        to: new Date(),
      },
    },
  });

  const watchedAccountId = watch('accountId');

  const onSubmit = (values: FormValues) => {
    onGenerate({
      accountId: values.accountId,
      from: values.dateRange.from.toISOString().slice(0, 10),
      to: values.dateRange.to.toISOString().slice(0, 10),
      type: values.statementType,
      format: values.format,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormSection title="Statement Request" description="Configure parameters and generate account statement">
        {/* Account Selector */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Account</label>
          <select
            {...register('accountId')}
            className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label}
              </option>
            ))}
          </select>
          {errors.accountId && (
            <p className="text-xs text-destructive">{errors.accountId.message}</p>
          )}
        </div>

        {/* Date Range */}
        <div className="space-y-1 mt-4">
          <label className="text-sm font-medium">Statement Period</label>
          <Controller
            name="dateRange"
            control={control}
            render={({ field }) => (
              <DateRangePicker
                value={field.value as { from?: Date; to?: Date }}
                onChange={(range: { from?: Date; to?: Date }) => {
                  if (range.from && range.to) {
                    field.onChange({ from: range.from, to: range.to });
                  }
                }}
              />
            )}
          />
          {(errors.dateRange?.from || errors.dateRange?.to) && (
            <p className="text-xs text-destructive">Please select a valid date range</p>
          )}
        </div>

        {/* Statement Type */}
        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium">Statement Type</label>
          <Controller
            name="statementType"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 gap-2">
                {STATEMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      field.value === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      checked={field.value === type.value}
                      onChange={() => field.onChange(type.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <div className="text-sm font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        {/* Format */}
        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium">Download Format</label>
          <Controller
            name="format"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => field.onChange(fmt.value)}
                    className={cn(
                      'flex-1 py-1.5 text-sm rounded-md border font-medium transition-colors',
                      field.value === fmt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating…' : 'Generate Statement'}
        </button>
      </FormSection>

      {/* ── Certificates section ─────────────────────────────────────── */}
      <FormSection title="Certificates & Letters" description="Issue formal banking documents" collapsible defaultOpen>
        {/* Certificate of Balance */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onCertificate(watchedAccountId)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-medium">Certificate of Balance</div>
              <div className="text-xs text-muted-foreground">Certified account balance for official use</div>
            </div>
          </button>

          {/* Account Confirmation Letter */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Account Confirmation Letter</div>
                <div className="text-xs text-muted-foreground">Confirm account existence and status</div>
              </div>
            </div>

            <div className="pl-2">
              <label className="text-xs text-muted-foreground font-medium">Purpose</label>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CONFIRMATION_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => onConfirmation(watchedAccountId, selectedPurpose)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 dark:text-blue-400 dark:border-blue-700 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Generate Confirmation Letter
            </button>
          </div>
        </div>
      </FormSection>
    </form>
  );
}
