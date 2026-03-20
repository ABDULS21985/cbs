import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { FxRateDisplay } from '../components/international/FxRateDisplay';
import { ChargesBreakdown } from '../components/international/ChargesBreakdown';
import { ComplianceChecks } from '../components/international/ComplianceChecks';
import { TransferTracker } from '../components/international/TransferTracker';
import { SwiftMessageViewer } from '../components/international/SwiftMessageViewer';
import { internationalPaymentApi, type InternationalTransferRequest, type InternationalTransferResponse } from '../api/internationalPaymentApi';

type Step = 'form' | 'review' | 'tracking';

export function InternationalTransferPage() {
  useEffect(() => { document.title = 'International Transfer | CBS'; }, []);
  const [step, setStep] = useState<Step>('form');
  const [result, setResult] = useState<InternationalTransferResponse | null>(null);
  const [form, setForm] = useState({
    fromAccountId: '', sendingCurrency: 'NGN', sendingAmount: 0, receivingCurrency: 'USD',
    beneficiaryName: '', beneficiaryAccountIban: '', beneficiaryBankName: '', beneficiarySwiftBic: '',
    beneficiaryBankAddress: '', beneficiaryCountry: '', purpose: '', purposeDescription: '', sourceOfFunds: '',
    chargeType: 'SHA' as 'OUR' | 'SHA' | 'BEN', supportingDocumentId: undefined as number | undefined,
  });

  const update = (field: string, value: unknown) => setForm((p) => ({ ...p, [field]: value }));

  // FX Rate
  const { data: fxRate, refetch: refetchRate, isFetching: rateRefreshing } = useQuery({
    queryKey: ['fx-rate', form.sendingCurrency, form.receivingCurrency],
    queryFn: () => internationalPaymentApi.getFxRate(form.sendingCurrency, form.receivingCurrency),
    enabled: form.sendingCurrency !== form.receivingCurrency,
    refetchInterval: 30000,
  });

  // Charges
  const { data: charges } = useQuery({
    queryKey: ['intl-charges', form.sendingAmount, form.sendingCurrency, form.chargeType],
    queryFn: () => internationalPaymentApi.previewCharges(form.sendingAmount, form.sendingCurrency, form.chargeType),
    enabled: form.sendingAmount > 0,
  });

  // Compliance
  const complianceMutation = useMutation({
    mutationFn: () => internationalPaymentApi.runComplianceChecks(form as any),
  });

  // Upload doc
  const uploadMutation = useMutation({
    mutationFn: (file: File) => internationalPaymentApi.uploadDocument(file),
    onSuccess: (res) => { update('supportingDocumentId', res.id); toast.success('Document uploaded'); },
  });

  // Submit
  const submitMutation = useMutation({
    mutationFn: (data: InternationalTransferRequest) => internationalPaymentApi.initiateTransfer(data),
    onSuccess: (res) => { setResult(res); setStep('tracking'); toast.success('Transfer initiated'); },
    onError: () => toast.error('Transfer failed'),
  });

  const handleReview = () => {
    complianceMutation.mutate(undefined, { onSettled: () => setStep('review') });
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      fromAccountId: Number(form.fromAccountId),
      sendingCurrency: form.sendingCurrency,
      sendingAmount: form.sendingAmount,
      receivingCurrency: form.receivingCurrency,
      beneficiaryName: form.beneficiaryName,
      beneficiaryAccountIban: form.beneficiaryAccountIban,
      beneficiaryBankName: form.beneficiaryBankName,
      beneficiarySwiftBic: form.beneficiarySwiftBic,
      beneficiaryBankAddress: form.beneficiaryBankAddress,
      beneficiaryCountry: form.beneficiaryCountry,
      purpose: form.purpose,
      purposeDescription: form.purposeDescription,
      sourceOfFunds: form.sourceOfFunds,
      chargeType: form.chargeType,
      supportingDocumentId: form.supportingDocumentId,
    });
  };

  if (step === 'tracking' && result) {
    return (
      <>
        <PageHeader title="International Transfer" subtitle={`Reference: ${result.transactionRef}`} />
        <div className="page-container max-w-2xl space-y-6">
          <TransferTracker timeline={result.timeline} />
          {result.swiftMessage && <SwiftMessageViewer message={result.swiftMessage} />}
        </div>
      </>
    );
  }

  if (step === 'review') {
    return (
      <>
        <PageHeader title="Review International Transfer" />
        <div className="page-container max-w-lg space-y-6">
          <ComplianceChecks checks={complianceMutation.data || null} isLoading={complianceMutation.isPending} />
          {charges && <ChargesBreakdown charges={charges} localCurrency={form.sendingCurrency} />}
          <div className="flex gap-3">
            <button onClick={() => setStep('form')} className="flex-1 px-4 py-2.5 border rounded-md text-sm hover:bg-muted">&larr; Back</button>
            <button onClick={handleSubmit} disabled={submitMutation.isPending || complianceMutation.data?.some((c) => c.status === 'BLOCK')} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitMutation.isPending ? 'Processing...' : 'Confirm Transfer'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="International Transfer" subtitle="Send money abroad via SWIFT" />
      <div className="page-container max-w-2xl space-y-6">
        <FormSection title="Transfer Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">From Account</label>
              <input value={form.fromAccountId} onChange={(e) => update('fromAccountId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Account ID" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sending Currency</label>
              <select value={form.sendingCurrency} onChange={(e) => update('sendingCurrency', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
              <MoneyInput value={form.sendingAmount} onChange={(v) => update('sendingAmount', v)} currency={form.sendingCurrency} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Receiving Currency</label>
              <select value={form.receivingCurrency} onChange={(e) => update('receivingCurrency', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="NGN">NGN</option>
              </select>
            </div>
          </div>
        </FormSection>

        {form.sendingCurrency !== form.receivingCurrency && (
          <FxRateDisplay rate={fxRate || null} sendingAmount={form.sendingAmount} onRefresh={() => refetchRate()} isRefreshing={rateRefreshing} />
        )}

        <FormSection title="Beneficiary Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Name</label><input value={form.beneficiaryName} onChange={(e) => update('beneficiaryName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Account / IBAN</label><input value={form.beneficiaryAccountIban} onChange={(e) => update('beneficiaryAccountIban', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bank Name</label><input value={form.beneficiaryBankName} onChange={(e) => update('beneficiaryBankName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">SWIFT / BIC</label><input value={form.beneficiarySwiftBic} onChange={(e) => update('beneficiarySwiftBic', e.target.value.toUpperCase())} maxLength={11} className="w-full px-3 py-2 border rounded-md text-sm font-mono" placeholder="e.g. CHASUS33" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Country</label><input value={form.beneficiaryCountry} onChange={(e) => update('beneficiaryCountry', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1">Bank Address</label><input value={form.beneficiaryBankAddress} onChange={(e) => update('beneficiaryBankAddress', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
          </div>
        </FormSection>

        <FormSection title="Remittance Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose</label>
              <select value={form.purpose} onChange={(e) => update('purpose', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="">Select purpose...</option>
                <option value="FAMILY_SUPPORT">Family Support</option><option value="EDUCATION">Education</option>
                <option value="MEDICAL">Medical</option><option value="BUSINESS">Business</option>
                <option value="INVESTMENT">Investment</option><option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Source of Funds</label>
              <select value={form.sourceOfFunds} onChange={(e) => update('sourceOfFunds', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="">Select...</option>
                <option value="SALARY">Salary</option><option value="SAVINGS">Savings</option>
                <option value="BUSINESS_INCOME">Business Income</option><option value="INVESTMENT_INCOME">Investment Income</option>
                <option value="GIFT">Gift</option><option value="OTHER">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose Description</label>
              <input value={form.purposeDescription} onChange={(e) => update('purposeDescription', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Charges & Documents">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Charges</label>
              <div className="flex gap-3">
                {(['OUR', 'SHA', 'BEN'] as const).map((ct) => (
                  <label key={ct} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted/50">
                    <input type="radio" checked={form.chargeType === ct} onChange={() => update('chargeType', ct)} className="text-primary" />
                    <span className="text-sm">{ct === 'OUR' ? 'OUR (sender pays all)' : ct === 'SHA' ? 'SHA (shared)' : 'BEN (beneficiary pays)'}</span>
                  </label>
                ))}
              </div>
            </div>

            {charges && <ChargesBreakdown charges={charges} localCurrency={form.sendingCurrency} />}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supporting Document</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer hover:bg-muted">
                <Upload className="w-4 h-4" /> Upload Document
                <input type="file" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} className="hidden" />
              </label>
              {form.supportingDocumentId && <span className="ml-2 text-xs text-green-600">Document uploaded</span>}
            </div>
          </div>
        </FormSection>

        <div className="flex justify-end gap-3">
          <button type="button" className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
          <button type="button" onClick={handleReview} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            Review Transfer &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
