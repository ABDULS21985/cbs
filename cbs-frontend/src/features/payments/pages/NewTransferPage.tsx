import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { BeneficiarySelector } from '../components/transfer/BeneficiarySelector';
import { NewBeneficiaryForm } from '../components/transfer/NewBeneficiaryForm';
import { FeePreview } from '../components/transfer/FeePreview';
import { TransferReview } from '../components/transfer/TransferReview';
import { TransferReceipt } from '../components/transfer/TransferReceipt';
import { RecentTransfersList } from '../components/transfer/RecentTransfersList';
import { useAccounts, useBeneficiaries, useInitiateTransfer, useDuplicateCheck } from '../hooks/useTransfer';
import type { TransferResponse, TransferRequest } from '../api/paymentApi';

type Step = 'form' | 'review' | 'receipt';

export function NewTransferPage() {
  const [step, setStep] = useState<Step>('form');
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [completedTransfer, setCompletedTransfer] = useState<TransferResponse | null>(null);

  const [form, setForm] = useState({
    fromAccountId: 0,
    transferType: 'INTERNAL' as TransferRequest['transferType'],
    beneficiaryAccount: '',
    beneficiaryName: '',
    beneficiaryBankCode: '',
    beneficiaryBankName: '',
    amount: 0,
    narration: '',
    saveBeneficiary: false,
    scheduleDate: '',
    scheduleType: 'immediate' as 'immediate' | 'scheduled',
  });

  const { data: accounts = [] } = useAccounts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const transferMutation = useInitiateTransfer();
  const duplicateCheck = useDuplicateCheck();

  const selectedAccount = accounts.find((a) => a.id === form.fromAccountId);

  const update = (field: string, value: unknown) => setForm((p) => ({ ...p, [field]: value }));

  const handleReview = () => {
    if (!form.fromAccountId || !form.beneficiaryAccount || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (selectedAccount && form.amount > selectedAccount.availableBalance) {
      toast.error('Insufficient funds');
      return;
    }
    // Check for duplicate
    duplicateCheck.mutate({ account: form.beneficiaryAccount, amount: form.amount }, {
      onSuccess: (res) => {
        if (res.isDuplicate) {
          toast.warning(`Possible duplicate: similar transfer (${res.existingRef}) found in the last 24 hours`);
        }
        setStep('review');
      },
      onError: () => setStep('review'),
    });
  };

  const handleConfirm = () => {
    transferMutation.mutate({
      fromAccountId: form.fromAccountId,
      transferType: form.transferType,
      beneficiaryAccountNumber: form.beneficiaryAccount,
      beneficiaryName: form.beneficiaryName,
      beneficiaryBankCode: form.beneficiaryBankCode || undefined,
      amount: form.amount,
      currency: selectedAccount?.currency || 'NGN',
      narration: form.narration,
      saveBeneficiary: form.saveBeneficiary,
      scheduleDate: form.scheduleType === 'scheduled' ? form.scheduleDate : undefined,
    }, {
      onSuccess: (result) => {
        setCompletedTransfer(result);
        setStep('receipt');
        toast.success('Transfer processed successfully');
      },
      onError: () => toast.error('Transfer failed. Please try again.'),
    });
  };

  const resetForm = () => {
    setStep('form');
    setCompletedTransfer(null);
    setForm({ fromAccountId: 0, transferType: 'INTERNAL', beneficiaryAccount: '', beneficiaryName: '', beneficiaryBankCode: '', beneficiaryBankName: '', amount: 0, narration: '', saveBeneficiary: false, scheduleDate: '', scheduleType: 'immediate' });
  };

  if (step === 'receipt' && completedTransfer) {
    return (
      <>
        <PageHeader title="Transfer Complete" />
        <div className="page-container py-8">
          <TransferReceipt transfer={completedTransfer} onNewTransfer={resetForm} />
        </div>
      </>
    );
  }

  if (step === 'review') {
    return (
      <>
        <PageHeader title="Review Transfer" />
        <div className="page-container py-6">
          <TransferReview
            fromAccount={selectedAccount?.accountNumber || ''}
            fromAccountName={selectedAccount?.accountName || ''}
            toAccount={form.beneficiaryAccount}
            toAccountName={form.beneficiaryName}
            toBankName={form.beneficiaryBankName}
            amount={form.amount}
            currency={selectedAccount?.currency || 'NGN'}
            narration={form.narration}
            scheduleDate={form.scheduleType === 'scheduled' ? form.scheduleDate : undefined}
            requiresApproval={form.amount > 1_000_000}
            onConfirm={handleConfirm}
            onBack={() => setStep('form')}
            isSubmitting={transferMutation.isPending}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="New Transfer" subtitle="Initiate a fund transfer" />
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <FormSection title="Transfer Details">
              <div className="space-y-4">
                {/* Source Account */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">From Account</label>
                  <select
                    value={form.fromAccountId}
                    onChange={(e) => update('fromAccountId', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value={0}>Select account...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} — {acc.accountName} ({acc.accountType}) · {formatMoney(acc.availableBalance, acc.currency)}
                      </option>
                    ))}
                  </select>
                  {selectedAccount && (
                    <p className="text-xs text-muted-foreground mt-1">Available: <span className="font-mono font-medium">{formatMoney(selectedAccount.availableBalance, selectedAccount.currency)}</span></p>
                  )}
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Transfer To</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'OWN_ACCOUNT', label: 'Own Account' },
                      { value: 'INTERNAL', label: 'Within BellBank' },
                      { value: 'NIP', label: 'Other Bank (NIP)' },
                      { value: 'SWIFT', label: 'International' },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted/50">
                        <input type="radio" name="transferType" value={opt.value} checked={form.transferType === opt.value} onChange={() => update('transferType', opt.value)} className="text-primary" />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Beneficiary */}
                {!showNewBeneficiary ? (
                  <BeneficiarySelector
                    beneficiaries={beneficiaries}
                    onSelect={(b) => { update('beneficiaryAccount', b.accountNumber); update('beneficiaryName', b.name); update('beneficiaryBankCode', b.bankCode); update('beneficiaryBankName', b.bankName); }}
                    onAddNew={() => setShowNewBeneficiary(true)}
                  />
                ) : (
                  <NewBeneficiaryForm onVerified={(data) => {
                    update('beneficiaryAccount', data.accountNumber);
                    update('beneficiaryName', data.verifiedName);
                    update('beneficiaryBankCode', data.bankCode);
                    update('beneficiaryBankName', data.bankName);
                    setShowNewBeneficiary(false);
                  }} />
                )}

                {form.beneficiaryName && (
                  <div className="p-2 bg-muted/50 rounded-md text-sm">
                    Sending to: <strong>{form.beneficiaryName}</strong> — {form.beneficiaryAccount}{form.beneficiaryBankName ? ` (${form.beneficiaryBankName})` : ''}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                  <MoneyInput value={form.amount} onChange={(v) => update('amount', v)} currency={selectedAccount?.currency || 'NGN'} />
                </div>

                {/* Narration */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Narration</label>
                  <input value={form.narration} onChange={(e) => update('narration', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Payment description" />
                </div>

                {/* Fee Preview */}
                <FeePreview amount={form.amount} transferType={form.transferType} currency={selectedAccount?.currency} />

                {/* Schedule */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={form.scheduleType === 'immediate'} onChange={() => update('scheduleType', 'immediate')} /> Immediate
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={form.scheduleType === 'scheduled'} onChange={() => update('scheduleType', 'scheduled')} /> Schedule for later
                  </label>
                  {form.scheduleType === 'scheduled' && (
                    <input type="datetime-local" value={form.scheduleDate} onChange={(e) => update('scheduleDate', e.target.value)} className="px-3 py-1.5 border rounded-md text-sm" />
                  )}
                </div>

                {/* Save beneficiary */}
                {form.beneficiaryName && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.saveBeneficiary} onChange={(e) => update('saveBeneficiary', e.target.checked)} className="rounded" />
                    Save beneficiary for future transfers
                  </label>
                )}
              </div>
            </FormSection>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
              <button type="button" onClick={handleReview} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                Review Transfer &rarr;
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <RecentTransfersList onRepeat={(tx) => {
              update('beneficiaryAccount', tx.beneficiaryAccount);
              update('beneficiaryName', tx.beneficiaryName);
              update('beneficiaryBankName', tx.bankName);
              update('amount', tx.amount);
            }} />
          </div>
        </div>
      </div>
    </>
  );
}
