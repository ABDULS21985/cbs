import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoneyInput, MoneyDisplay, InfoGrid } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Printer } from 'lucide-react';
import { useLoan, useRecordPayment } from '../hooks/useLoanData';
import { loanApi } from '../api/loanApi';

type PaymentType = 'REGULAR' | 'PARTIAL' | 'MULTIPLE' | 'SETTLEMENT';

export function LoanRepaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loanId = Number(id);
  const [paymentType, setPaymentType] = useState<PaymentType>('REGULAR');
  const [amount, setAmount] = useState(0);
  const [receipt, setReceipt] = useState<{ ref: string; amount: number } | null>(null);

  const { data: loan } = useLoan(loanId);
  const { data: settlement } = useQuery({
    queryKey: ['loans', loanId, 'settlement'],
    queryFn: () => loanApi.calculateSettlement(loanId),
    enabled: !!loanId,
  });

  const paymentMutation = useRecordPayment(loanId);

  const outstanding = loan?.outstandingBalance ?? 0;
  const nextDue = loan?.nextInstallmentAmount ?? 0;
  const settlementAmount = settlement?.totalSettlementAmount ?? 0;

  const displayAmount = paymentType === 'REGULAR' ? nextDue : paymentType === 'SETTLEMENT' ? settlementAmount : amount;

  const handleSubmit = async () => {
    paymentMutation.mutate(
      { amount: displayAmount, sourceAccountId: loan?.sourceAccountId ?? 0, type: paymentType },
      {
        onSuccess: (payment) => {
          setReceipt({ ref: payment.reference ?? `PMT-${Date.now().toString(36).toUpperCase()}`, amount: displayAmount });
          toast.success('Payment recorded successfully');
        },
        onError: () => {
          toast.error('Failed to record payment. Please try again.');
        },
      },
    );
  };

  const submitting = paymentMutation.isPending;

  if (receipt) {
    return (
      <>
        <PageHeader title="Payment Receipt" backTo={`/lending/${id}`} />
        <div className="page-container max-w-lg mx-auto">
          <div className="rounded-xl border bg-card p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h3 className="text-xl font-semibold">Payment Successful</h3>
            <div className="text-3xl font-bold font-mono text-primary">{formatMoney(receipt.amount)}</div>
            <p className="text-sm text-muted-foreground">Reference: <span className="font-mono">{receipt.ref}</span></p>
            <div className="flex gap-3 justify-center pt-4">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-muted"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={() => navigate(`/lending/${id}`)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Back to Loan</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Record Repayment" subtitle={`Loan Outstanding: ${formatMoney(outstanding)}`} backTo={`/lending/${id}`} />
      <div className="page-container max-w-lg mx-auto space-y-6">
        {/* Payment Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Type</label>
          {(['REGULAR', 'PARTIAL', 'MULTIPLE', 'SETTLEMENT'] as PaymentType[]).map((type) => (
            <label key={type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${paymentType === type ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
              <input type="radio" name="type" checked={paymentType === type} onChange={() => setPaymentType(type)} className="text-primary" />
              <span className="text-sm">{type === 'REGULAR' ? 'Regular Payment (next installment)' : type === 'PARTIAL' ? 'Partial Payment' : type === 'MULTIPLE' ? 'Multiple Installments' : 'Full Settlement'}</span>
            </label>
          ))}
        </div>

        {/* Amount */}
        {paymentType === 'SETTLEMENT' ? (
          <div className="rounded-lg border p-5 space-y-3">
            <h4 className="text-sm font-semibold">Settlement Calculation</h4>
            <InfoGrid columns={2} items={[
              { label: 'Outstanding Principal', value: settlement?.outstandingPrincipal ?? 0, format: 'money' },
              { label: 'Accrued Interest', value: settlement?.accruedInterest ?? 0, format: 'money' },
              { label: 'Early Settlement Penalty', value: settlement?.penalty ?? 0, format: 'money' },
              { label: 'Total Settlement', value: settlementAmount, format: 'money' },
            ]} />
          </div>
        ) : paymentType === 'PARTIAL' ? (
          <MoneyInput label="Payment Amount" value={amount} onChange={setAmount} currency="NGN" max={outstanding} />
        ) : (
          <div className="rounded-lg border p-4">
            <span className="text-sm text-muted-foreground">Amount: </span>
            <MoneyDisplay amount={nextDue} size="lg" />
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Pay ${formatMoney(displayAmount)}`}
        </button>
      </div>
    </>
  );
}
