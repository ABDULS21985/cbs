import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Info,
  Loader2,
  Receipt,
} from 'lucide-react';

import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';

import {
  billPaymentApi,
  type Biller,
  type BillPaymentResponse,
  type BillValidationResult,
} from '../../api/billPaymentApi';
import { useAccounts } from '../../hooks/useTransfer';

type FormStep = 'details' | 'review';

interface Props {
  biller: Biller;
  onSuccess: (result: BillPaymentResponse) => void;
  onBack: () => void;
  prefillFields?: Record<string, string>;
}

export function BillPaymentForm({ biller, onSuccess, onBack, prefillFields }: Props) {
  const [formStep, setFormStep] = useState<FormStep>('details');
  const [fields, setFields] = useState<Record<string, string>>(prefillFields ?? {});
  const [amount, setAmount] = useState(biller.isFixedAmount ? biller.fixedAmount || 0 : 0);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [validation, setValidation] = useState<BillValidationResult | null>(null);
  const [saveFavorite, setSaveFavorite] = useState(false);

  const { data: accounts = [] } = useAccounts();
  const selectedAccount = accounts.find((account) => account.id === Number(sourceAccountId));

  const fee = biller.commissionType === 'FLAT'
    ? biller.commission
    : Math.round((amount * biller.commission) / 100 * 100) / 100;
  const totalDebit = amount + fee;

  const { data: feePreview } = useQuery({
    queryKey: ['bill-fee', biller.code, amount],
    queryFn: () => billPaymentApi.getFeePreview(biller.code, amount),
    enabled: amount > 0,
  });

  const displayFee = feePreview?.fee ?? fee;
  const displayTotal = feePreview?.totalDebit ?? totalDebit;

  const validateMutation = useMutation({
    mutationFn: () => billPaymentApi.validateReference(biller.code, fields),
    onSuccess: (result) => {
      setValidation(result);
      if (!result.referenceValid) {
        toast.error('Invalid customer reference');
      }
    },
    onError: () => toast.error('Could not validate reference. Please check and try again.'),
  });

  const payMutation = useMutation({
    mutationFn: () => billPaymentApi.payBill({
      billerId: biller.id,
      billerCode: biller.code,
      sourceAccountId: Number(sourceAccountId),
      amount,
      fields,
      saveFavorite,
    }),
    onSuccess: (result) => {
      toast.success('Payment successful');
      onSuccess(result);
    },
    onError: () => toast.error('Payment failed. Please try again.'),
  });

  const amountError = (() => {
    if (amount <= 0) {
      return null;
    }
    if (biller.minAmount && amount < biller.minAmount) {
      return `Minimum amount is ${formatMoney(biller.minAmount, 'NGN')}`;
    }
    if (biller.maxAmount && amount > biller.maxAmount) {
      return `Maximum amount is ${formatMoney(biller.maxAmount, 'NGN')}`;
    }
    if (selectedAccount && displayTotal > selectedAccount.availableBalance) {
      return 'Insufficient funds';
    }
    return null;
  })();

  const canProceed = amount > 0 &&
    !amountError &&
    !!sourceAccountId &&
    biller.fields.every((field) => !field.required || fields[field.name]);

  const handleProceedToReview = () => {
    if (!canProceed) {
      toast.error('Please fill in all required fields');
      return;
    }

    setFormStep('review');
  };

  if (formStep === 'review') {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setFormStep('details')} className="payment-action-button">
          <ArrowLeft className="h-4 w-4" />
          Edit payment details
        </button>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.85fr)]">
          <FormSection title="Review Payment" description="Confirm the biller, customer details, and debit account before submission.">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Biller</span>
                <span className="font-medium text-foreground">{biller.name}</span>
              </div>
              {biller.fields.map((field) => (
                <div key={field.name} className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="text-foreground">{fields[field.name] || '-'}</span>
                </div>
              ))}
              {validation?.referenceValid && validation.customerName ? (
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Customer Name</span>
                  <span className="font-medium text-emerald-600">{validation.customerName}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Source Account</span>
                <span className="text-foreground">{selectedAccount?.accountNumber} - {selectedAccount?.accountName}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono text-foreground">{formatMoney(amount, 'NGN')}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-mono text-foreground">{formatMoney(displayFee, 'NGN')}</span>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <span>Total Debit</span>
                <span className="font-mono text-foreground">{formatMoney(displayTotal, 'NGN')}</span>
              </div>
            </div>
          </FormSection>

          <div className="space-y-4">
            <div className="payment-panel payment-panel-muted p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Debit summary</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The selected account will be debited immediately after confirmation.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Available balance</span>
                  <span className="font-medium text-foreground">
                    {selectedAccount ? formatMoney(selectedAccount.availableBalance, selectedAccount.currency) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Commission model</span>
                  <span className="font-medium text-foreground">{biller.commissionType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Favorite</span>
                  <span className="font-medium text-foreground">{saveFavorite ? 'Save after pay' : 'Do not save'}</span>
                </div>
              </div>
            </div>

            {selectedAccount && displayTotal > selectedAccount.availableBalance ? (
              <div className="flex items-start gap-2 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                Insufficient funds. Available balance: {formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending || (selectedAccount != null && displayTotal > selectedAccount.availableBalance)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing payment
                </>
              ) : (
                `Confirm and Pay ${formatMoney(displayTotal, 'NGN')}`
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="payment-action-button">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-6">
          <FormSection title={biller.name} description="Enter the customer reference, amount, and funding account for this biller.">
            <div className="space-y-4">
              {(biller.minAmount || biller.maxAmount) ? (
                <div className="flex items-start gap-2 rounded-[1rem] bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {biller.minAmount && biller.maxAmount
                      ? `Amount range: ${formatMoney(biller.minAmount, 'NGN')} - ${formatMoney(biller.maxAmount, 'NGN')}`
                      : biller.minAmount
                        ? `Minimum amount: ${formatMoney(biller.minAmount, 'NGN')}`
                        : `Maximum amount: ${formatMoney(biller.maxAmount || 0, 'NGN')}`}
                  </span>
                </div>
              ) : null}

              {biller.fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {field.label} {field.required ? <span className="text-red-500">*</span> : null}
                  </label>
                  {field.type === 'SELECT' ? (
                    <select
                      value={fields[field.name] || ''}
                      onChange={(event) => setFields({ ...fields, [field.name]: event.target.value })}
                      className="payment-command-input"
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'NUMBER' ? 'number' : 'text'}
                      value={fields[field.name] || ''}
                      onChange={(event) => {
                        setFields({ ...fields, [field.name]: event.target.value });
                        setValidation(null);
                      }}
                      className="payment-command-input"
                      placeholder={field.validation ? `Format: ${field.validation}` : undefined}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              {biller.fields.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending || biller.fields.some((field) => field.required && !fields[field.name])}
                    className="payment-action-button disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {validateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Validate Customer
                  </button>
                  {validation == null && !validateMutation.isPending ? (
                    <span className="text-xs text-muted-foreground">Validate before paying</span>
                  ) : null}
                </div>
              ) : null}

              {validation?.referenceValid ? (
                <div className="flex items-start gap-2 rounded-[1rem] bg-emerald-50 px-4 py-3 dark:bg-emerald-900/10">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{validation.customerName}</p>
                    {validation.outstandingBalance != null ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Outstanding balance: {formatMoney(validation.outstandingBalance, 'NGN')}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {validation && !validation.referenceValid ? (
                <div className="flex items-start gap-2 rounded-[1rem] bg-red-50 px-4 py-3 dark:bg-red-900/10">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Invalid reference. Please check and try again.
                  </p>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Amount <span className="text-red-500">*</span>
                </label>
                {biller.isFixedAmount ? (
                  <div className="payment-panel payment-panel-muted px-4 py-3 text-sm font-mono">
                    {formatMoney(biller.fixedAmount || 0, 'NGN')}
                    <span className="ml-2 text-xs text-muted-foreground">(Fixed amount)</span>
                  </div>
                ) : (
                  <MoneyInput value={amount} onChange={setAmount} currency="NGN" />
                )}
                {amountError ? <p className="mt-1 text-xs text-red-500">{amountError}</p> : null}
              </div>

              {amount > 0 ? (
                <div className="payment-panel payment-panel-muted p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-mono text-foreground">{formatMoney(displayFee, 'NGN')}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Debit</span>
                    <span className="font-mono text-foreground">{formatMoney(displayTotal, 'NGN')}</span>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Source Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  className="payment-command-input"
                >
                  <option value="">Select account...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountNumber} - {account.accountName} ({account.currency}) - {formatMoney(account.availableBalance, account.currency)}
                    </option>
                  ))}
                </select>
                {selectedAccount ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Available: <span className="font-mono font-medium">{formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}</span>
                  </p>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={saveFavorite}
                  onChange={(event) => setSaveFavorite(event.target.checked)}
                  className="rounded"
                />
                Save as favorite for quick repeat payments
              </label>
            </div>
          </FormSection>
        </div>

        <div className="space-y-4">
          <div className="payment-panel p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payment Snapshot</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{formatMoney(amount || 0, 'NGN')}</p>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Biller code</span>
                <span className="font-medium text-foreground">{biller.code}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Commission</span>
                <span className="font-medium text-foreground">{biller.commissionType}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="font-medium text-foreground">{biller.status}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToReview}
            disabled={!canProceed}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review Payment
          </button>
        </div>
      </div>
    </div>
  );
}
