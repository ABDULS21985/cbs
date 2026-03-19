import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import {
  useLettersOfCredit,
  useIssueLc,
  useSettleLc,
  useBankGuarantees,
  useIssueGuarantee,
  useClaimGuarantee,
  useScfProgrammes,
  useCreateScfProgramme,
  useFactoringFacilities,
  useSubmitInvoice,
  useFundInvoice,
  useVerifyDocument,
} from '../hooks/useTradeFinanceExt';
import type {
  LetterOfCredit,
  BankGuarantee,
  ScfProgramme,
  FactoredInvoice,
  TradeDocument,
  LcPaymentTerms,
  GuaranteeType,
  DocumentComplianceStatus,
} from '../api/tradeFinanceExtApi';
import { formatMoney, formatDate } from '@/lib/formatters';
import { FileText, Shield, Layers, DollarSign, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

// ─── Badge Helpers ────────────────────────────────────────────────────────────

function LcStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ISSUED'
      ? 'bg-blue-50 text-blue-700'
      : status === 'SETTLED'
        ? 'bg-green-50 text-green-700'
        : status === 'EXPIRED'
          ? 'bg-gray-100 text-gray-600'
          : 'bg-red-50 text-red-700';
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cls)}>
      {status}
    </span>
  );
}

function GuaranteeTypeBadge({ type }: { type: string }) {
  const label =
    type === 'PERFORMANCE'
      ? 'Performance'
      : type === 'ADVANCE_PAYMENT'
        ? 'Advance Payment'
        : type === 'BID_BOND'
          ? 'Bid Bond'
          : 'Standby LC';
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {label}
    </span>
  );
}

function ComplianceBadge({ status }: { status: string }) {
  if (status === 'COMPLIANT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Compliant
      </span>
    );
  }
  if (status === 'DISCREPANT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
        <AlertCircle className="w-3 h-3" /> Discrepant
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

// ─── Issue LC Dialog ──────────────────────────────────────────────────────────

function IssueLcDialog({ onClose }: { onClose: () => void }) {
  const issueLc = useIssueLc();
  const [form, setForm] = useState({
    applicant: '',
    beneficiary: '',
    currency: 'USD',
    amount: '',
    expiryDate: '',
    paymentTerms: 'SIGHT' as LcPaymentTerms,
    tenor: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    issueLc.mutate(
      {
        applicant: form.applicant,
        beneficiary: form.beneficiary,
        currency: form.currency,
        amount: parseFloat(form.amount) || 0,
        expiryDate: form.expiryDate,
        paymentTerms: form.paymentTerms,
        tenor: form.tenor ? parseInt(form.tenor, 10) : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Issue New Letter of Credit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Applicant</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.applicant}
                onChange={(e) => setForm((f) => ({ ...f, applicant: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Beneficiary</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.beneficiary}
                onChange={(e) => setForm((f) => ({ ...f, beneficiary: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {['USD', 'EUR', 'GBP', 'NGN'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.paymentTerms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentTerms: e.target.value as LcPaymentTerms }))
                }
              >
                <option value="SIGHT">Sight</option>
                <option value="USANCE">Usance</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Tenor (days, if Usance)
              </label>
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.tenor}
                onChange={(e) => setForm((f) => ({ ...f, tenor: e.target.value }))}
                placeholder="e.g. 90"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
            <input
              type="date"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueLc.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {issueLc.isPending ? 'Issuing…' : 'Issue LC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Settle LC Dialog ─────────────────────────────────────────────────────────

function SettleLcDialog({ lc, onClose }: { lc: LetterOfCredit; onClose: () => void }) {
  const settleLc = useSettleLc();
  const [form, setForm] = useState({ presentationDate: '', docsRaw: '', discrepancies: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const presentedDocuments = form.docsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    settleLc.mutate(
      {
        id: lc.id,
        input: {
          presentationDate: form.presentationDate,
          presentedDocuments,
          discrepancies: form.discrepancies || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Settle LC</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ref: <span className="font-mono">{lc.lcRef}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Presentation Date</label>
            <input
              type="date"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.presentationDate}
              onChange={(e) => setForm((f) => ({ ...f, presentationDate: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Presented Documents (comma-separated)
            </label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.docsRaw}
              onChange={(e) => setForm((f) => ({ ...f, docsRaw: e.target.value }))}
              placeholder="Bill of Lading, Commercial Invoice, ..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Discrepancies (optional)
            </label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.discrepancies}
              onChange={(e) => setForm((f) => ({ ...f, discrepancies: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={settleLc.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {settleLc.isPending ? 'Settling…' : 'Settle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Issue Guarantee Dialog ───────────────────────────────────────────────────

function IssueGuaranteeDialog({ onClose }: { onClose: () => void }) {
  const issueGuarantee = useIssueGuarantee();
  const [form, setForm] = useState({
    applicant: '',
    beneficiary: '',
    guaranteeType: 'PERFORMANCE' as GuaranteeType,
    currency: 'USD',
    amount: '',
    expiryDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    issueGuarantee.mutate(
      { ...form, amount: parseFloat(form.amount) || 0 },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Issue Bank Guarantee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Applicant</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.applicant}
                onChange={(e) => setForm((f) => ({ ...f, applicant: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Beneficiary</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.beneficiary}
                onChange={(e) => setForm((f) => ({ ...f, beneficiary: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Guarantee Type</label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.guaranteeType}
              onChange={(e) =>
                setForm((f) => ({ ...f, guaranteeType: e.target.value as GuaranteeType }))
              }
            >
              <option value="PERFORMANCE">Performance</option>
              <option value="ADVANCE_PAYMENT">Advance Payment</option>
              <option value="BID_BOND">Bid Bond</option>
              <option value="STANDBY_LC">Standby LC</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {['USD', 'EUR', 'GBP', 'NGN'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
            <input
              type="date"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={issueGuarantee.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {issueGuarantee.isPending ? 'Issuing…' : 'Issue Guarantee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Claim Guarantee Dialog ───────────────────────────────────────────────────

function ClaimGuaranteeDialog({
  guarantee,
  onClose,
}: {
  guarantee: BankGuarantee;
  onClose: () => void;
}) {
  const claimGuarantee = useClaimGuarantee();
  const [form, setForm] = useState({ claimAmount: '', claimRef: '', claimDate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    claimGuarantee.mutate(
      {
        id: guarantee.id,
        input: { claimAmount: parseFloat(form.claimAmount) || 0, claimRef: form.claimRef, claimDate: form.claimDate },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Process Guarantee Claim</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ref: <span className="font-mono">{guarantee.guaranteeRef}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Claim Amount</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.claimAmount}
              onChange={(e) => setForm((f) => ({ ...f, claimAmount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Claim Reference</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.claimRef}
              onChange={(e) => setForm((f) => ({ ...f, claimRef: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Claim Date</label>
            <input
              type="date"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.claimDate}
              onChange={(e) => setForm((f) => ({ ...f, claimDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={claimGuarantee.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
            >
              {claimGuarantee.isPending ? 'Processing…' : 'Process Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SCF Programme Dialog ─────────────────────────────────────────────────────

function NewScfProgrammeDialog({ onClose }: { onClose: () => void }) {
  const createScf = useCreateScfProgramme();
  const [form, setForm] = useState({ buyer: '', currency: 'USD', discountRate: '', limitAmount: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScf.mutate(
      {
        buyer: form.buyer,
        currency: form.currency,
        discountRate: parseFloat(form.discountRate) || 0,
        limitAmount: parseFloat(form.limitAmount) || 0,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New SCF Programme</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Buyer</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.buyer}
              onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {['USD', 'EUR', 'GBP', 'NGN'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Discount Rate %</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.discountRate}
                onChange={(e) => setForm((f) => ({ ...f, discountRate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Limit</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.limitAmount}
                onChange={(e) => setForm((f) => ({ ...f, limitAmount: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createScf.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createScf.isPending ? 'Creating…' : 'Create Programme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Finance Invoice Dialog ───────────────────────────────────────────────────

function FinanceInvoiceDialog({ onClose }: { onClose: () => void }) {
  const financeInvoice = useSubmitInvoice();
  const [form, setForm] = useState({
    facilityCode: '',
    buyerName: '',
    invoiceRef: '',
    amount: '',
    invoiceDate: '',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    financeInvoice.mutate(
      { ...form, amount: parseFloat(form.amount) || 0 },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Finance Invoice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Facility Code</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.facilityCode}
                onChange={(e) => setForm((f) => ({ ...f, facilityCode: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Buyer Name</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Invoice Ref</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.invoiceRef}
                onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Invoice Date</label>
              <input
                type="date"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.invoiceDate}
                onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Due Date</label>
              <input
                type="date"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={financeInvoice.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {financeInvoice.isPending ? 'Submitting…' : 'Finance Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Verify Document Dialog ───────────────────────────────────────────────────

function VerifyDocumentDialog({
  doc,
  onClose,
}: {
  doc: TradeDocument;
  onClose: () => void;
}) {
  const verifyDocument = useVerifyDocument();
  const [status, setStatus] = useState<DocumentComplianceStatus>('COMPLIANT');
  const [discrepanciesRaw, setDiscrepanciesRaw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const discrepancies =
      status === 'DISCREPANT'
        ? discrepanciesRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
    verifyDocument.mutate({ id: doc.id, input: { status, discrepancies } }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Verify Document</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ref: <span className="font-mono">{doc.documentRef}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Compliance Status</label>
            <div className="mt-2 flex gap-3">
              {(['COMPLIANT', 'DISCREPANT'] as DocumentComplianceStatus[]).map((s) => (
                <label
                  key={s}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors',
                    status === s
                      ? s === 'COMPLIANT'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                  />
                  {s === 'COMPLIANT' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {s}
                </label>
              ))}
            </div>
          </div>
          {status === 'DISCREPANT' && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Discrepancies (comma-separated)
              </label>
              <textarea
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                value={discrepanciesRaw}
                onChange={(e) => setDiscrepanciesRaw(e.target.value)}
                placeholder="Missing signature, Wrong date, ..."
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={verifyDocument.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {verifyDocument.isPending ? 'Verifying…' : 'Submit Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function LcsTab() {
  const [showIssue, setShowIssue] = useState(false);
  const [settlingLc, setSettlingLc] = useState<LetterOfCredit | null>(null);
  const { data: lcs = [], isLoading } = useLettersOfCredit();

  const lcCols: ColumnDef<LetterOfCredit, unknown>[] = [
    {
      accessorKey: 'lcRef',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.lcRef}</span>
      ),
    },
    { accessorKey: 'applicant', header: 'Applicant' },
    { accessorKey: 'beneficiary', header: 'Beneficiary' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'currency',
      header: 'CCY',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.currency}</span>
      ),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry',
      cell: ({ row }) => formatDate(row.original.expiryDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <LcStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === 'ISSUED' && (
            <button
              onClick={() => setSettlingLc(row.original)}
              className="text-xs px-2 py-1 rounded border hover:bg-muted font-medium"
            >
              Settle
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {showIssue && <IssueLcDialog onClose={() => setShowIssue(false)} />}
      {settlingLc && <SettleLcDialog lc={settlingLc} onClose={() => setSettlingLc(null)} />}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Letters of Credit
        </h3>
        <button
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Issue New LC
        </button>
      </div>
      <DataTable
        columns={lcCols}
        data={lcs}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="letters-of-credit"
        emptyMessage="No letters of credit found"
      />
    </div>
  );
}

function GuaranteesTab() {
  const [showIssue, setShowIssue] = useState(false);
  const [claimingBg, setClaimingBg] = useState<BankGuarantee | null>(null);
  const { data: guarantees = [], isLoading } = useBankGuarantees();

  const bgCols: ColumnDef<BankGuarantee, unknown>[] = [
    {
      accessorKey: 'guaranteeRef',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.guaranteeRef}</span>
      ),
    },
    { accessorKey: 'applicant', header: 'Applicant' },
    { accessorKey: 'beneficiary', header: 'Beneficiary' },
    {
      accessorKey: 'guaranteeType',
      header: 'Type',
      cell: ({ row }) => <GuaranteeTypeBadge type={row.original.guaranteeType} />,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry',
      cell: ({ row }) => formatDate(row.original.expiryDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === 'ISSUED' && (
            <button
              onClick={() => setClaimingBg(row.original)}
              className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 font-medium"
            >
              Claim
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {showIssue && <IssueGuaranteeDialog onClose={() => setShowIssue(false)} />}
      {claimingBg && (
        <ClaimGuaranteeDialog guarantee={claimingBg} onClose={() => setClaimingBg(null)} />
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Bank Guarantees
        </h3>
        <button
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Issue Guarantee
        </button>
      </div>
      <DataTable
        columns={bgCols}
        data={guarantees}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="bank-guarantees"
        emptyMessage="No bank guarantees found"
      />
    </div>
  );
}

function ScfFactoringTab() {
  const [showNewProg, setShowNewProg] = useState(false);
  const [showFinanceInv, setShowFinanceInv] = useState(false);

  const { data: programmes = [], isLoading: progLoading } = useScfProgrammes();
  const { isLoading: facLoading } = useFactoringFacilities();
  const invoices: FactoredInvoice[] = [];
  const fundInvoice = useFundInvoice();

  const scfCols: ColumnDef<ScfProgramme, unknown>[] = [
    {
      accessorKey: 'programmeRef',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.programmeRef}</span>
      ),
    },
    { accessorKey: 'buyer', header: 'Buyer' },
    {
      accessorKey: 'limitAmount',
      header: 'Limit',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.limitAmount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'discountRate',
      header: 'Discount Rate',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.discountRate}%</span>
      ),
    },
    {
      accessorKey: 'utilizationPct',
      header: 'Utilization',
      cell: ({ row }) => {
        const pct = row.original.utilizationPct ?? 0;
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
  ];

  const facCols: ColumnDef<FactoredInvoice, unknown>[] = [
    {
      accessorKey: 'facilityCode',
      header: 'Facility',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.facilityCode}</span>
      ),
    },
    { accessorKey: 'buyerName', header: 'Buyer' },
    {
      accessorKey: 'invoiceRef',
      header: 'Invoice Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.invoiceRef}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.amount.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        row.original.status === 'SUBMITTED' ? (
          <button
            onClick={() => fundInvoice.mutate(row.original.id)}
            disabled={fundInvoice.isPending}
            className="text-xs px-2 py-1 rounded border hover:bg-muted font-medium disabled:opacity-50"
          >
            Fund
          </button>
        ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {showNewProg && <NewScfProgrammeDialog onClose={() => setShowNewProg(false)} />}
      {showFinanceInv && <FinanceInvoiceDialog onClose={() => setShowFinanceInv(false)} />}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            SCF Programmes
          </h3>
          <button
            onClick={() => setShowNewProg(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New SCF Programme
          </button>
        </div>
        <DataTable
          columns={scfCols}
          data={programmes}
          isLoading={progLoading}
          emptyMessage="No SCF programmes"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Factored Invoices
          </h3>
          <button
            onClick={() => setShowFinanceInv(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted"
          >
            <Plus className="w-4 h-4" /> Finance Invoice
          </button>
        </div>
        <DataTable
          columns={facCols}
          data={invoices}
          isLoading={facLoading}
          emptyMessage="No factored invoices"
        />
      </div>
    </div>
  );
}

function CollectionsTab() {
  const collectionsPlaceholder: Array<{
    id: number;
    collectionRef: string;
    drawer: string;
    drawee: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    createdAt: string;
  }> = [];

  const collCols: ColumnDef<(typeof collectionsPlaceholder)[0], unknown>[] = [
    {
      accessorKey: 'collectionRef',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.collectionRef}</span>
      ),
    },
    { accessorKey: 'drawer', header: 'Drawer' },
    { accessorKey: 'drawee', header: 'Drawee' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={collCols}
        data={collectionsPlaceholder}
        isLoading={false}
        enableGlobalFilter
        emptyMessage="No documentary collections"
      />
    </div>
  );
}

function DocumentsTab() {
  const [verifyingDoc, setVerifyingDoc] = useState<TradeDocument | null>(null);

  const docPlaceholder: TradeDocument[] = [];

  const docCols: ColumnDef<TradeDocument, unknown>[] = [
    {
      accessorKey: 'documentRef',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.documentRef}</span>
      ),
    },
    {
      accessorKey: 'documentType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.documentType} />,
    },
    {
      accessorKey: 'lcId',
      header: 'LC ID',
      cell: ({ row }) =>
        row.original.lcId ? (
          <span className="font-mono text-xs">{row.original.lcId}</span>
        ) : (
          '—'
        ),
    },
    {
      accessorKey: 'complianceStatus',
      header: 'Compliance',
      cell: ({ row }) => <ComplianceBadge status={row.original.complianceStatus} />,
    },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded',
      cell: ({ row }) => formatDate(row.original.uploadedAt),
    },
    {
      accessorKey: 'verifiedAt',
      header: 'Verified',
      cell: ({ row }) => (row.original.verifiedAt ? formatDate(row.original.verifiedAt) : '—'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        row.original.complianceStatus === 'PENDING' ? (
          <button
            onClick={() => setVerifyingDoc(row.original)}
            className="text-xs px-2 py-1 rounded border hover:bg-muted font-medium"
          >
            Verify
          </button>
        ) : null,
    },
  ];

  return (
    <div className="p-4">
      {verifyingDoc && (
        <VerifyDocumentDialog doc={verifyingDoc} onClose={() => setVerifyingDoc(null)} />
      )}
      <DataTable
        columns={docCols}
        data={docPlaceholder}
        isLoading={false}
        enableGlobalFilter
        emptyMessage="No trade documents"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TradeFinanceHubPage() {
  const { data: lcs = [], isLoading: lcsLoading } = useLettersOfCredit();
  const { data: guarantees = [], isLoading: bgsLoading } = useBankGuarantees();
  const { data: scfProgrammes = [], isLoading: scfLoading } = useScfProgrammes();
  const { data: factoringFacilities = [], isLoading: facLoading } = useFactoringFacilities();

  const activeLcs = lcs.filter((lc) => lc.status === 'ISSUED').length;
  const activeGuarantees = guarantees.filter((bg) => bg.status === 'ISSUED').length;

  // Factoring volume: sum of limit amounts across all factoring facilities
  const factoringVolume = factoringFacilities.reduce(
    (s, f) => s + (f.limitAmount ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Trade Finance Hub"
        subtitle="Manage letters of credit, guarantees, SCF, factoring, and trade documents"
        actions={
          <div className="flex gap-2">
            <span className="text-xs text-muted-foreground self-center">
              Auto-refreshes every 30s
            </span>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active LCs"
            value={activeLcs}
            format="number"
            icon={FileText}
            loading={lcsLoading}
          />
          <StatCard
            label="Active Guarantees"
            value={activeGuarantees}
            format="number"
            icon={Shield}
            loading={bgsLoading}
          />
          <StatCard
            label="SCF Programmes"
            value={scfProgrammes.length}
            format="number"
            icon={Layers}
            loading={scfLoading}
          />
          <StatCard
            label="Factoring Volume"
            value={factoringVolume}
            format="money"
            compact
            icon={DollarSign}
            loading={facLoading}
          />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'lcs',
              label: 'Letters of Credit',
              badge: activeLcs || undefined,
              content: <LcsTab />,
            },
            {
              id: 'guarantees',
              label: 'Guarantees',
              badge: activeGuarantees || undefined,
              content: <GuaranteesTab />,
            },
            {
              id: 'scf',
              label: 'SCF / Factoring',
              content: <ScfFactoringTab />,
            },
            {
              id: 'collections',
              label: 'Collections',
              content: <CollectionsTab />,
            },
            {
              id: 'documents',
              label: 'Documents',
              content: <DocumentsTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
