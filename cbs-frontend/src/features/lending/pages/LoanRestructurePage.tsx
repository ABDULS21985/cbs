import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export function LoanRestructurePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState('');
  const [newRate, setNewRate] = useState(15);
  const [newTenor, setNewTenor] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  const currentRate = 18;
  const currentTenor = 8;
  const outstanding = 3356789;
  const currentPayment = 133333;
  const newPayment = outstanding / newTenor;

  const REASONS = ['Financial Difficulty', 'Rate Review', 'Tenor Extension', 'Customer Request', 'Regulatory'];

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    toast.success('Restructure request submitted for approval');
    navigate(`/lending/${id}`);
  };

  return (
    <>
      <PageHeader title="Loan Restructuring" subtitle={`Loan Outstanding: ${formatMoney(outstanding)}`} backTo={`/lending/${id}`} />
      <div className="page-container max-w-2xl mx-auto space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Reason & Type</h3>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Restructure Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                <option value="">Select reason</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={() => setStep(1)} disabled={!reason} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Step 2: New Terms</h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/30"><th className="px-4 py-2 text-left"></th><th className="px-4 py-2 text-right">Current</th><th className="px-4 py-2 text-right">Proposed</th></tr></thead>
                <tbody>
                  <tr className="border-t"><td className="px-4 py-2 font-medium">Outstanding</td><td className="px-4 py-2 text-right font-mono">{formatMoney(outstanding)}</td><td className="px-4 py-2 text-right font-mono">{formatMoney(outstanding)}</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-medium">Interest Rate</td><td className="px-4 py-2 text-right font-mono">{currentRate}%</td><td className="px-4 py-2 text-right"><input type="number" value={newRate} onChange={(e) => setNewRate(parseFloat(e.target.value))} className="w-20 px-2 py-1 rounded border text-right font-mono" step="0.5" />%</td></tr>
                  <tr className="border-t"><td className="px-4 py-2 font-medium">Remaining Tenor</td><td className="px-4 py-2 text-right font-mono">{currentTenor} months</td><td className="px-4 py-2 text-right"><input type="number" value={newTenor} onChange={(e) => setNewTenor(parseInt(e.target.value))} className="w-20 px-2 py-1 rounded border text-right font-mono" min={1} /> months</td></tr>
                  <tr className="border-t bg-primary/5"><td className="px-4 py-2 font-semibold">Monthly Payment</td><td className="px-4 py-2 text-right font-mono">{formatMoney(currentPayment)}</td><td className="px-4 py-2 text-right font-mono font-semibold text-primary">{formatMoney(newPayment)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
