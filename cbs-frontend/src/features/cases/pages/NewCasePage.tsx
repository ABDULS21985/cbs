import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { caseApi, type CustomerCase } from '../api/caseApi';

const subCategories: Record<string, string[]> = {
  COMPLAINT: ['Service Quality', 'Charges/Fees', 'Account Issues', 'Card Issues', 'ATM/POS', 'Online Banking', 'Staff Behaviour'],
  SERVICE_REQUEST: ['Account Update', 'Card Request', 'Statement', 'Reference Letter', 'Cheque Book', 'Token/OTP'],
  INQUIRY: ['Product Information', 'Balance Inquiry', 'Rate Inquiry', 'General'],
  DISPUTE: ['Transaction Dispute', 'Charge Dispute', 'Interest Dispute'],
  FRAUD_REPORT: ['Unauthorized Transaction', 'Phishing', 'Card Fraud', 'Identity Theft'],
  ACCOUNT_ISSUE: ['Account Lock', 'Account Update', 'Dormant Account', 'KYC Update'],
  PAYMENT_ISSUE: ['Failed Transfer', 'Delayed Payment', 'Wrong Beneficiary', 'Reversal'],
  CARD_ISSUE: ['Card Blocked', 'Card Replacement', 'PIN Reset', 'Card Activation'],
  LOAN_ISSUE: ['Repayment Issue', 'Disbursement Delay', 'Interest Query', 'Early Settlement'],
  FEE_REVERSAL: ['Maintenance Fee', 'SMS Fee', 'Transaction Fee', 'Penalty Fee'],
  DOCUMENT_REQUEST: ['Statement', 'Reference Letter', 'Audit Confirmation', 'Tax Certificate'],
  PRODUCT_CHANGE: ['Account Upgrade', 'Account Downgrade', 'Product Switch'],
  CLOSURE: ['Account Closure', 'Card Closure', 'Loan Closure'],
  REGULATORY: ['CBN Directive', 'Compliance Issue', 'AML/CFT'],
  ESCALATION: ['Management Escalation', 'Regulatory Escalation', 'Ombudsman'],
};

export function NewCasePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    caseType: '' as CustomerCase['caseType'] | '',
    subCategory: '',
    priority: 'MEDIUM' as CustomerCase['priority'],
    subject: '',
    description: '',
    assignedTo: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CustomerCase>) => caseApi.create(data),
    onSuccess: (created) => {
      toast.success(`Case ${created.caseNumber} created`);
      navigate(`/cases/${created.caseNumber}`);
    },
    onError: () => toast.error('Failed to create case'),
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PageHeader title="New Case" subtitle="Create a new customer case or complaint" />
      <div className="page-container max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              customerId: Number(form.customerId),
              customerName: form.customerName,
              caseType: form.caseType as CustomerCase['caseType'],
              subCategory: form.subCategory,
              priority: form.priority,
              subject: form.subject,
              description: form.description,
              assignedTo: form.assignedTo || undefined,
            });
          }}
          className="space-y-6"
        >
          <FormSection title="Customer">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer ID</label>
                <input value={form.customerId} onChange={(e) => update('customerId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Search customer..." required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer Name</label>
                <input value={form.customerName} onChange={(e) => update('customerName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
              </div>
            </div>
          </FormSection>

          <FormSection title="Case Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Case Type</label>
                <select value={form.caseType} onChange={(e) => { update('caseType', e.target.value); update('subCategory', ''); }} className="w-full px-3 py-2 border rounded-md text-sm" required>
                  <option value="">Select type...</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="SERVICE_REQUEST">Service Request</option>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="DISPUTE">Dispute</option>
                  <option value="FRAUD_REPORT">Fraud Report</option>
                  <option value="ACCOUNT_ISSUE">Account Issue</option>
                  <option value="PAYMENT_ISSUE">Payment Issue</option>
                  <option value="CARD_ISSUE">Card Issue</option>
                  <option value="LOAN_ISSUE">Loan Issue</option>
                  <option value="FEE_REVERSAL">Fee Reversal</option>
                  <option value="DOCUMENT_REQUEST">Document Request</option>
                  <option value="PRODUCT_CHANGE">Product Change</option>
                  <option value="CLOSURE">Closure</option>
                  <option value="REGULATORY">Regulatory</option>
                  <option value="ESCALATION">Escalation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sub-Category</label>
                <select value={form.subCategory} onChange={(e) => update('subCategory', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" disabled={!form.caseType}>
                  <option value="">Select...</option>
                  {form.caseType && subCategories[form.caseType]?.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => update('priority', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assign To (optional)</label>
                <input value={form.assignedTo} onChange={(e) => update('assignedTo', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Agent name or ID" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
              <input value={form.subject} onChange={(e) => update('subject', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} className="w-full px-3 py-2 border rounded-md text-sm" required />
            </div>
          </FormSection>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/cases')} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
