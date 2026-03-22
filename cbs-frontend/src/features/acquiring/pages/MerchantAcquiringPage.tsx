import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Store,
  AlertTriangle,
  DollarSign,
  FileWarning,
  Plus,
  Loader2,
  XCircle,
  CheckCircle2,
  PauseCircle,
  Shield,
  RefreshCw,
  ChevronRight,
  Building2,
  Monitor,
  Wifi,
  WifiOff,
  Search,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useActiveMerchants,
  useHighRiskMerchants,
  useAllMerchants,
  useChargebacks,
  usePciCompliance,
  useOnboardMerchant,
  useActivateMerchant,
  useSuspendMerchant,
  useMerchantSettlements,
  useProcessSettlement,
  useRecordChargeback,
  useSubmitRepresentment,
  useSetupFacility,
  useActivateFacility,
  useAllTerminals,
  useRegisterTerminal,
  useUpdateTerminalStatus,
} from '../hooks/useAcquiring';
import { useAcquiringFacilities } from '../hooks/useAcquiringExt';
import type {
  RiskCategory,
  ChargebackStatus,
  SettlementStatus,
  MerchantStatus,
  Merchant,
  PosTerminal,
  RecordChargebackPayload,
} from '../api/acquiringApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'merchants' | 'facilities' | 'settlements' | 'chargebacks' | 'pci' | 'terminals';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(n?: number, currency = 'NGN') {
  if (n === undefined || n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

const RISK_BADGE: Record<RiskCategory, string> = {
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PROHIBITED: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const MERCHANT_STATUS_BADGE: Record<MerchantStatus, string> = {
  PENDING: 'text-amber-600',
  ACTIVE: 'text-green-600',
  SUSPENDED: 'text-red-600',
  TERMINATED: 'text-gray-500',
  UNDER_REVIEW: 'text-purple-600',
};

const MERCHANT_STATUS_DOT: Record<MerchantStatus, string> = {
  PENDING: 'bg-amber-400',
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-red-500',
  TERMINATED: 'bg-gray-400',
  UNDER_REVIEW: 'bg-purple-500',
};

const CHARGEBACK_STATUS_BADGE: Record<ChargebackStatus, string> = {
  RECEIVED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NOTIFIED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EVIDENCE_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REPRESENTMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ARBITRATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CLOSED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const SETTLEMENT_STATUS_BADGE: Record<SettlementStatus, string> = {
  CALCULATED: 'text-amber-600',
  APPROVED: 'text-blue-600',
  SETTLED: 'text-green-600',
  DISPUTE: 'text-red-600',
};

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

// ─── Error Banner ────────────────────────────────────────────────────────────

function QueryError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-5 flex items-center gap-4">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

// ─── Onboard Merchant Dialog ──────────────────────────────────────────────────

interface OnboardDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    merchantName: string;
    registrationNumber: string;
    merchantCategoryCode: string;
    businessType: string;
    contactEmail: string;
    settlementAccountId: number;
    mdrRate: number;
    riskCategory: RiskCategory;
  }) => void;
  isPending: boolean;
}

function OnboardDialog({ open, onClose, onSubmit, isPending }: OnboardDialogProps) {
  const [form, setForm] = useState({
    merchantName: '',
    registrationNumber: '',
    merchantCategoryCode: '',
    businessType: 'LIMITED_COMPANY',
    contactEmail: '',
    settlementAccountId: '',
    mdrRate: '1.50',
    riskCategory: 'LOW' as RiskCategory,
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      settlementAccountId: parseInt(form.settlementAccountId, 10),
      mdrRate: parseFloat(form.mdrRate),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
            <h2 className="text-base font-semibold">Onboard Merchant</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Merchant Name</label>
              <input
                required
                className={inputCls}
                value={form.merchantName}
                onChange={(e) => setForm((f) => ({ ...f, merchantName: e.target.value }))}
                placeholder="Acme Retail Ltd"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Registration Number</label>
              <input
                required
                className={inputCls}
                value={form.registrationNumber}
                onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                placeholder="RC-000000"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">MCC Code</label>
                <input
                  required
                  maxLength={10}
                  className={inputCls}
                  value={form.merchantCategoryCode}
                  onChange={(e) => setForm((f) => ({ ...f, merchantCategoryCode: e.target.value }))}
                  placeholder="5411"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Risk Category</label>
                <select
                  className={inputCls}
                  value={form.riskCategory}
                  onChange={(e) => setForm((f) => ({ ...f, riskCategory: e.target.value as RiskCategory }))}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Type</label>
              <select
                className={inputCls}
                value={form.businessType}
                onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
              >
                <option value="SOLE_PROPRIETOR">Sole Proprietor</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LIMITED_COMPANY">Limited Company</option>
                <option value="PLC">PLC</option>
                <option value="GOVERNMENT">Government</option>
                <option value="NGO">NGO</option>
                <option value="COOPERATIVE">Cooperative</option>
                <option value="FRANCHISE">Franchise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Email</label>
              <input
                required
                type="email"
                className={inputCls}
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="merchant@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Settlement Account ID</label>
                <input
                  required
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.settlementAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, settlementAccountId: e.target.value }))}
                  placeholder="Account ID"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">MDR Rate (%)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={form.mdrRate}
                  onChange={(e) => setForm((f) => ({ ...f, mdrRate: e.target.value }))}
                  placeholder="1.50"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Onboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Suspend Dialog ───────────────────────────────────────────────────────────

interface SuspendDialogProps {
  open: boolean;
  merchant: Merchant | null;
  onClose: () => void;
  onSuspend: (merchantId: string, reason: string) => void;
  isPending: boolean;
}

function SuspendDialog({ open, merchant, onClose, onSuspend, isPending }: SuspendDialogProps) {
  const [reason, setReason] = useState('');
  if (!open || !merchant) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <PauseCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Suspend Merchant</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Suspending <strong>{merchant.merchantName}</strong>. Provide a reason.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
              <textarea
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Compliance violation, fraud risk, etc."
              />
              <p className="text-[10px] text-muted-foreground mt-1">{reason.length}/500</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                disabled={!reason.trim() || isPending}
                onClick={() => onSuspend(merchant.merchantId, reason)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
                Suspend
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Record Chargeback Dialog ─────────────────────────────────────────────────

interface RecordChargebackDialogProps {
  open: boolean;
  merchants: Merchant[];
  onClose: () => void;
  onSubmit: (payload: RecordChargebackPayload) => void;
  isPending: boolean;
}

function RecordChargebackDialog({ open, merchants, onClose, onSubmit, isPending }: RecordChargebackDialogProps) {
  const [form, setForm] = useState({
    merchantId: 0,
    originalTransactionRef: '',
    transactionDate: '',
    transactionAmount: '',
    cardNetwork: 'VISA',
    reasonCode: '',
    reasonDescription: '',
    chargebackAmount: '',
    currency: 'NGN',
    evidenceDeadline: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      merchantId: form.merchantId,
      originalTransactionRef: form.originalTransactionRef || undefined,
      transactionDate: form.transactionDate || undefined,
      transactionAmount: form.transactionAmount ? parseFloat(form.transactionAmount) : undefined,
      cardNetwork: form.cardNetwork || undefined,
      reasonCode: form.reasonCode || undefined,
      reasonDescription: form.reasonDescription || undefined,
      chargebackAmount: parseFloat(form.chargebackAmount),
      currency: form.currency || undefined,
      evidenceDeadline: form.evidenceDeadline || undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
            <h2 className="text-base font-semibold">Record Chargeback</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Merchant</label>
              <select
                required
                className={inputCls}
                value={form.merchantId}
                onChange={(e) => setForm((f) => ({ ...f, merchantId: Number(e.target.value) }))}
              >
                <option value={0}>Select merchant...</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>{m.merchantName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Transaction Ref</label>
              <input
                className={inputCls}
                maxLength={40}
                value={form.originalTransactionRef}
                onChange={(e) => setForm((f) => ({ ...f, originalTransactionRef: e.target.value }))}
                placeholder="TXN-20260101-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Transaction Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.transactionDate}
                  onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Transaction Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputCls}
                  value={form.transactionAmount}
                  onChange={(e) => setForm((f) => ({ ...f, transactionAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Card Network</label>
                <select
                  className={inputCls}
                  value={form.cardNetwork}
                  onChange={(e) => setForm((f) => ({ ...f, cardNetwork: e.target.value }))}
                >
                  <option value="VISA">Visa</option>
                  <option value="MASTERCARD">Mastercard</option>
                  <option value="VERVE">Verve</option>
                  <option value="INTERSWITCH">Interswitch</option>
                  <option value="AMEX">Amex</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Currency</label>
                <select
                  className={inputCls}
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason Code</label>
                <input
                  className={inputCls}
                  maxLength={10}
                  value={form.reasonCode}
                  onChange={(e) => setForm((f) => ({ ...f, reasonCode: e.target.value }))}
                  placeholder="4853"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Chargeback Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0.01}
                  className={inputCls}
                  value={form.chargebackAmount}
                  onChange={(e) => setForm((f) => ({ ...f, chargebackAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason Description</label>
              <input
                className={inputCls}
                maxLength={200}
                value={form.reasonDescription}
                onChange={(e) => setForm((f) => ({ ...f, reasonDescription: e.target.value }))}
                placeholder="Goods or services not received"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Evidence Deadline</label>
              <input
                type="date"
                className={inputCls}
                value={form.evidenceDeadline}
                onChange={(e) => setForm((f) => ({ ...f, evidenceDeadline: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.merchantId || !form.chargebackAmount || isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileWarning className="w-4 h-4" />}
                Record Chargeback
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Representment Dialog ─────────────────────────────────────────────────────

interface RepresentmentDialogProps {
  open: boolean;
  chargebackId: number | null;
  onClose: () => void;
  onSubmit: (id: number, responseRef: string, evidence: Record<string, unknown>) => void;
  isPending: boolean;
}

function RepresentmentDialog({ open, chargebackId, onClose, onSubmit, isPending }: RepresentmentDialogProps) {
  const [evidence, setEvidence] = useState('');
  const [responseRef, setResponseRef] = useState('');
  if (!open || chargebackId === null) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Submit Representment</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(chargebackId, responseRef, { description: evidence });
            }}
            className="p-6 space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Response Reference</label>
              <input
                required
                maxLength={80}
                className={inputCls}
                value={responseRef}
                onChange={(e) => setResponseRef(e.target.value)}
                placeholder="REP-2026-001"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Evidence</label>
              <textarea
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={4}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Provide transaction evidence, receipt references, etc."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !responseRef.trim() || !evidence.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Merchants Tab ────────────────────────────────────────────────────────────

function MerchantsTab() {
  const { isAdmin, isOfficer } = useAuth();
  const canView = isAdmin || isOfficer;
  const { data: allMerchants = [], isLoading, isError, error, refetch } = useAllMerchants();
  // High-risk endpoint is admin-only per @PreAuthorize("hasRole('CBS_ADMIN')")
  const { data: highRisk = [] } = useHighRiskMerchants();
  const { mutate: onboard, isPending: onboarding } = useOnboardMerchant();
  const { mutate: activate, isPending: activating } = useActivateMerchant();
  const { mutate: suspend, isPending: suspending } = useSuspendMerchant();
  const [showOnboard, setShowOnboard] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Merchant | null>(null);
  const [statusFilter, setStatusFilter] = useState<MerchantStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const highRiskIds = new Set(highRisk.map((m) => m.id));

  const filteredMerchants = useMemo(() => {
    let result = allMerchants;
    if (statusFilter !== 'ALL') {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.merchantName.toLowerCase().includes(q) ||
          m.merchantId.toLowerCase().includes(q) ||
          (m.registrationNumber && m.registrationNumber.toLowerCase().includes(q)) ||
          m.merchantCategoryCode.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allMerchants, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allMerchants.length };
    for (const m of allMerchants) {
      counts[m.status] = (counts[m.status] || 0) + 1;
    }
    return counts;
  }, [allMerchants]);

  if (isError) {
    return <QueryError message={`Failed to load merchants: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'UNDER_REVIEW'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s === 'ALL' ? 'All' : s === 'UNDER_REVIEW' ? 'Review' : s.charAt(0) + s.slice(1).toLowerCase()}
              {statusCounts[s] ? ` (${statusCounts[s]})` : ''}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowOnboard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Onboard Merchant
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">MCC</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Risk</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Terminals</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">MDR Rate</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Onboarded</th>
                  {isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMerchants.map((m) => (
                  <tr
                    key={m.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors',
                      highRiskIds.has(m.id) && 'bg-red-50/30 dark:bg-red-900/5',
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.merchantName}</div>
                      <div className="text-xs text-muted-foreground">{m.registrationNumber ?? m.merchantId}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{m.merchantCategoryCode}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          RISK_BADGE[m.riskCategory] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {highRiskIds.has(m.id) && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {m.riskCategory}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          MERCHANT_STATUS_BADGE[m.status] ?? 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            MERCHANT_STATUS_DOT[m.status] ?? 'bg-gray-400',
                          )}
                        />
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground text-xs">
                      {m.terminalCount ?? 0}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground text-xs">
                      {m.mdrRate != null ? `${m.mdrRate}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(m.onboardedAt)}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {(m.status === 'PENDING' || m.status === 'SUSPENDED' || m.status === 'UNDER_REVIEW') &&
                            m.riskCategory !== 'PROHIBITED' && (
                            <button
                              onClick={() => activate(m.merchantId, {
                                onSuccess: () => toast.success(`${m.merchantName} activated`),
                                onError: () => toast.error(`Failed to activate ${m.merchantName}`),
                              })}
                              disabled={activating}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-300 text-green-600 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors disabled:opacity-50"
                            >
                              {activating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Activate
                            </button>
                          )}
                          {m.status === 'ACTIVE' && (
                            <button
                              onClick={() => setSuspendTarget(m)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-600 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                            >
                              <PauseCircle className="w-3 h-3" />
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredMerchants.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'No merchants match your filters.'
                        : 'No merchants found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OnboardDialog
        open={showOnboard}
        onClose={() => setShowOnboard(false)}
        onSubmit={(payload) =>
          onboard(payload, {
            onSuccess: () => { setShowOnboard(false); toast.success('Merchant onboarded successfully'); },
            onError: () => toast.error('Failed to onboard merchant'),
          })
        }
        isPending={onboarding}
      />
      <SuspendDialog
        open={!!suspendTarget}
        merchant={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onSuspend={(merchantId, reason) =>
          suspend({ merchantId, reason }, {
            onSuccess: () => { setSuspendTarget(null); toast.success('Merchant suspended'); },
            onError: () => toast.error('Failed to suspend merchant'),
          })
        }
        isPending={suspending}
      />
    </div>
  );
}

// ─── Settlements Tab ──────────────────────────────────────────────────────────

function SettlementsTab() {
  const { data: merchants = [] } = useAllMerchants();
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const { data: settlements = [], isLoading, isError, error, refetch } = useMerchantSettlements(selectedMerchantId ?? 0);
  const { mutate: processSettlement, isPending: processing } = useProcessSettlement();
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [processDate, setProcessDate] = useState('');

  const handleProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantId || !processDate) return;
    processSettlement(
      { merchantId: selectedMerchantId, date: processDate },
      {
        onSuccess: () => {
          setShowProcessForm(false);
          setProcessDate('');
          toast.success('Settlement processed successfully');
        },
        onError: (err) => toast.error(`Failed to process settlement: ${(err as Error)?.message ?? 'Unknown error'}`),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={selectedMerchantId ?? ''}
          onChange={(e) => setSelectedMerchantId(e.target.value ? parseInt(e.target.value, 10) : null)}
        >
          <option value="">Select Merchant</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.merchantName}
            </option>
          ))}
        </select>
        {selectedMerchantId && (
          <button
            onClick={() => setShowProcessForm(!showProcessForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Process Settlement
          </button>
        )}
      </div>

      {showProcessForm && (
        <form
          onSubmit={handleProcess}
          className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Settlement Date</label>
            <input
              required
              type="date"
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={processDate}
              onChange={(e) => setProcessDate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Run
          </button>
          <button
            type="button"
            onClick={() => setShowProcessForm(false)}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Settlement History</h3>
        </div>
        {!selectedMerchantId ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Store className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Select a merchant to view settlements</p>
          </div>
        ) : isError ? (
          <div className="p-4">
            <QueryError message={`Failed to load settlements: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Gross</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">MDR</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Fees</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Chargebacks</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Net</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(s.settlementDate)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatAmount(s.grossTransactionAmount)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground text-xs">
                      {formatAmount(s.mdrDeducted)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground text-xs">
                      {formatAmount(s.otherFeesDeducted)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground text-xs">
                      {formatAmount(s.chargebackDeductions)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-green-600">
                      {formatAmount(s.netSettlementAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          SETTLEMENT_STATUS_BADGE[s.status] ?? 'text-muted-foreground',
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                      {s.settlementReference ?? '—'}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No settlement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chargebacks Tab ──────────────────────────────────────────────────────────

function ChargebacksTab() {
  const { data: chargebacks = [], isLoading, isError, error, refetch } = useChargebacks();
  const { data: merchants = [] } = useAllMerchants();
  const { mutate: recordChargeback, isPending: recording } = useRecordChargeback();
  const { mutate: submitRepresentment, isPending: submitting } = useSubmitRepresentment();
  const [representmentTarget, setRepresentmentTarget] = useState<number | null>(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ChargebackStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChargebacks = useMemo(() => {
    let result = chargebacks;
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.originalTransactionRef && c.originalTransactionRef.toLowerCase().includes(q)) ||
          (c.reasonDescription && c.reasonDescription.toLowerCase().includes(q)) ||
          (c.cardNetwork && c.cardNetwork.toLowerCase().includes(q)) ||
          (c.reasonCode && c.reasonCode.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [chargebacks, statusFilter, searchQuery]);

  const pendingCount = chargebacks.filter(
    (c) => c.status === 'RECEIVED' || c.status === 'NOTIFIED' || c.status === 'EVIDENCE_REQUESTED',
  ).length;

  if (isError) {
    return <QueryError message={`Failed to load chargebacks: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              {pendingCount} chargeback{pendingCount !== 1 ? 's' : ''} require attention
            </span>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {(['ALL', 'RECEIVED', 'EVIDENCE_REQUESTED', 'REPRESENTMENT', 'ARBITRATION', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s === 'ALL' ? 'All' : s === 'EVIDENCE_REQUESTED' ? 'Evidence' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search chargebacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowRecordForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Chargeback
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Transaction Ref</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Network</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Reason</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Deadline</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Filed</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredChargebacks.map((cb) => (
                  <tr key={cb.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cb.originalTransactionRef ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">{cb.cardNetwork ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatAmount(cb.chargebackAmount, cb.currency)}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[180px] truncate" title={cb.reasonDescription ?? cb.reasonCode ?? '—'}>
                      {cb.reasonCode ? `[${cb.reasonCode}] ` : ''}{cb.reasonDescription ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(cb.evidenceDeadline)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          CHARGEBACK_STATUS_BADGE[cb.status] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {cb.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(cb.createdAt)}</td>
                    <td className="px-5 py-3">
                      {(cb.status === 'RECEIVED' || cb.status === 'NOTIFIED' || cb.status === 'EVIDENCE_REQUESTED') && (
                        <button
                          onClick={() => setRepresentmentTarget(cb.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <FileWarning className="w-3 h-3" />
                          Representment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredChargebacks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'No chargebacks match your filters.'
                        : 'No chargebacks recorded.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordChargebackDialog
        open={showRecordForm}
        merchants={merchants}
        onClose={() => setShowRecordForm(false)}
        onSubmit={(payload) =>
          recordChargeback(payload, {
            onSuccess: () => { setShowRecordForm(false); toast.success('Chargeback recorded successfully'); },
            onError: () => toast.error('Failed to record chargeback'),
          })
        }
        isPending={recording}
      />

      <RepresentmentDialog
        open={representmentTarget !== null}
        chargebackId={representmentTarget}
        onClose={() => setRepresentmentTarget(null)}
        onSubmit={(id, responseRef, evidence) =>
          submitRepresentment(
            { id, responseRef, evidence },
            {
              onSuccess: () => { setRepresentmentTarget(null); toast.success('Representment submitted'); },
              onError: () => toast.error('Failed to submit representment'),
            },
          )
        }
        isPending={submitting}
      />
    </div>
  );
}

// ─── PCI Compliance Tab ───────────────────────────────────────────────────────

function PciComplianceTab() {
  const { data: report, isLoading, isError, error, refetch } = usePciCompliance();

  if (isError) {
    return <QueryError message={`Failed to load PCI compliance report: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report || Object.keys(report).length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-20 text-center text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No PCI compliance data available. Set up acquiring facilities first.</p>
      </div>
    );
  }

  const compliantFacilities = report['COMPLIANT'] ?? [];
  const nonCompliantFacilities = report['NON_COMPLIANT'] ?? [];
  const pendingSaqFacilities = report['PENDING_SAQ'] ?? [];
  const pendingAsvFacilities = report['PENDING_ASV'] ?? [];

  const totalFacilities =
    compliantFacilities.length + nonCompliantFacilities.length +
    pendingSaqFacilities.length + pendingAsvFacilities.length;

  const complianceGroups = [
    { label: 'Compliant', count: compliantFacilities.length, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    { label: 'Non-Compliant', count: nonCompliantFacilities.length, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
    { label: 'Pending SAQ', count: pendingSaqFacilities.length, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Pending ASV', count: pendingAsvFacilities.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  ];

  const isFullyCompliant = nonCompliantFacilities.length === 0 && pendingSaqFacilities.length === 0 && pendingAsvFacilities.length === 0;
  const hasNonCompliant = nonCompliantFacilities.length > 0;

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <div
        className={cn(
          'rounded-xl border p-5 flex items-center gap-4',
          isFullyCompliant
            ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
            : hasNonCompliant
              ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
              : 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800',
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            isFullyCompliant
              ? 'bg-green-100 dark:bg-green-900/30'
              : hasNonCompliant
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30',
          )}
        >
          {isFullyCompliant ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : hasNonCompliant ? (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          ) : (
            <RefreshCw className="w-6 h-6 text-amber-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            PCI DSS Compliance —{' '}
            <span
              className={cn(
                isFullyCompliant ? 'text-green-700' : hasNonCompliant ? 'text-red-700' : 'text-amber-700',
              )}
            >
              {isFullyCompliant ? 'COMPLIANT' : hasNonCompliant ? 'NON COMPLIANT' : 'IN PROGRESS'}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {compliantFacilities.length} of {totalFacilities} facilities are fully PCI compliant
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{totalFacilities}</p>
          <p className="text-xs text-muted-foreground">Total Facilities</p>
        </div>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {complianceGroups.map(({ label, count, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4', bg)}>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('text-3xl font-bold mt-1 tabular-nums', color)}>{count}</p>
          </div>
        ))}
      </div>

      {/* Facility Details by Status */}
      {Object.entries(report).map(([status, facilities]) => (
        facilities.length > 0 && (
          <div key={status} className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h4 className="text-sm font-semibold">{status.replace(/_/g, ' ')} ({facilities.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Merchant</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Processor</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">3DS</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Fraud Screening</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground">Compliance Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {facilities.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="px-5 py-2 text-xs">Merchant #{f.merchantId}</td>
                      <td className="px-5 py-2 text-xs">{f.facilityType ?? '—'}</td>
                      <td className="px-5 py-2 text-xs">{f.processorConnection ?? '—'}</td>
                      <td className="px-5 py-2 text-xs">
                        {f.threeDSecureEnabled ? (
                          <span className="text-green-600">Enabled</span>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-xs">
                        {f.fraudScreeningEnabled ? (
                          <span className="text-green-600">Enabled</span>
                        ) : (
                          <span className="text-red-600">Disabled</span>
                        )}
                      </td>
                      <td className="px-5 py-2 text-xs">{formatDate(f.pciComplianceDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// ─── Facilities Tab ──────────────────────────────────────────────────────────

function FacilitiesTab() {
  const { data: facilities = [], isLoading, isError, error, refetch } = useAcquiringFacilities();
  const { data: merchants = [] } = useAllMerchants();
  const setupFacility = useSetupFacility();
  const activateFacility = useActivateFacility();
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    merchantId: 0,
    settlementCycle: 'T1',
    mdrRatePct: 1.5,
    facilityType: 'CARD_PRESENT',
    processorConnection: 'VISA',
    settlementCurrency: 'NGN',
    dailyTransactionLimit: '',
    monthlyVolumeLimit: '',
    chargebackLimitPct: '1.00',
    reserveHoldPct: '5.00',
    terminalIdPrefix: '',
  });

  const activeCount = facilities.filter((f) => f.status === 'ACTIVE').length;

  if (isError) {
    return <QueryError message={`Failed to load facilities: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{facilities.length} facilities · {activeCount} active</div>
        <button onClick={() => setShowSetup(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Setup Facility
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No acquiring facilities configured</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b"><tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Merchant</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Processor</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Settlement</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">MDR %</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Reserve %</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">PCI</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {facilities.map((f) => (
                <tr key={f.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">Merchant #{f.merchantId}</td>
                  <td className="px-4 py-2.5 text-xs">{f.facilityType ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs">{f.processorConnection ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs">{f.settlementCycle ?? '—'} ({f.settlementCurrency})</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{f.mdrRatePct != null ? `${Number(f.mdrRatePct).toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{f.reserveHoldPct != null ? `${Number(f.reserveHoldPct).toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                      f.pciComplianceStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700'
                        : f.pciComplianceStatus === 'NON_COMPLIANT' ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700')}>
                      {f.pciComplianceStatus?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                      f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {f.status !== 'ACTIVE' && f.status !== 'TERMINATED' && (
                      <button onClick={() => activateFacility.mutate(f.id, {
                        onSuccess: () => toast.success('Facility activated'),
                        onError: () => toast.error('Failed to activate facility'),
                      })}
                        disabled={activateFacility.isPending}
                        className="text-xs text-primary hover:underline font-medium">
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Setup Dialog */}
      {showSetup && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSetup(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Setup Acquiring Facility</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Merchant</label>
                  <select value={setupForm.merchantId} onChange={(e) => setSetupForm((f) => ({ ...f, merchantId: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value={0}>Select merchant...</option>
                    {merchants.map((m: Merchant) => <option key={m.id} value={m.id}>{m.merchantName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Facility Type</label>
                    <select value={setupForm.facilityType} onChange={(e) => setSetupForm((f) => ({ ...f, facilityType: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                      <option value="CARD_PRESENT">Card Present</option>
                      <option value="CARD_NOT_PRESENT">Card Not Present</option>
                      <option value="ECOMMERCE">E-Commerce</option>
                      <option value="MPOS">mPOS</option>
                      <option value="QR">QR</option>
                      <option value="RECURRING">Recurring</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Processor Connection</label>
                    <select value={setupForm.processorConnection} onChange={(e) => setSetupForm((f) => ({ ...f, processorConnection: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                      <option value="VISA">Visa</option>
                      <option value="MASTERCARD">Mastercard</option>
                      <option value="VERVE">Verve</option>
                      <option value="AMEX">Amex</option>
                      <option value="UNION_PAY">Union Pay</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Settlement Cycle</label>
                    <select value={setupForm.settlementCycle} onChange={(e) => setSetupForm((f) => ({ ...f, settlementCycle: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                      <option value="T0">T+0 (Same Day)</option>
                      <option value="T1">T+1 (Next Day)</option>
                      <option value="T2">T+2 (Two Days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Settlement Currency</label>
                    <select value={setupForm.settlementCurrency} onChange={(e) => setSetupForm((f) => ({ ...f, settlementCurrency: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">MDR Rate (%)</label>
                    <input type="number" step="0.01" min={0} max={100} value={setupForm.mdrRatePct}
                      onChange={(e) => setSetupForm((f) => ({ ...f, mdrRatePct: parseFloat(e.target.value) || 0 }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Terminal ID Prefix</label>
                    <input maxLength={20} value={setupForm.terminalIdPrefix}
                      onChange={(e) => setSetupForm((f) => ({ ...f, terminalIdPrefix: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="POS-" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Chargeback Limit (%)</label>
                    <input type="number" step="0.01" min={0} max={100} value={setupForm.chargebackLimitPct}
                      onChange={(e) => setSetupForm((f) => ({ ...f, chargebackLimitPct: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reserve Hold (%)</label>
                    <input type="number" step="0.01" min={0} max={100} value={setupForm.reserveHoldPct}
                      onChange={(e) => setSetupForm((f) => ({ ...f, reserveHoldPct: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Daily Tx Limit</label>
                    <input type="number" step="0.01" min={0} value={setupForm.dailyTransactionLimit}
                      onChange={(e) => setSetupForm((f) => ({ ...f, dailyTransactionLimit: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Monthly Volume Limit</label>
                    <input type="number" step="0.01" min={0} value={setupForm.monthlyVolumeLimit}
                      onChange={(e) => setSetupForm((f) => ({ ...f, monthlyVolumeLimit: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Optional" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowSetup(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => {
                  setupFacility.mutate({
                    merchantId: setupForm.merchantId,
                    facilityType: setupForm.facilityType,
                    processorConnection: setupForm.processorConnection,
                    settlementCycle: setupForm.settlementCycle,
                    settlementCurrency: setupForm.settlementCurrency,
                    mdrRatePct: setupForm.mdrRatePct,
                    terminalIdPrefix: setupForm.terminalIdPrefix || undefined,
                    dailyTransactionLimit: setupForm.dailyTransactionLimit ? parseFloat(setupForm.dailyTransactionLimit) : undefined,
                    monthlyVolumeLimit: setupForm.monthlyVolumeLimit ? parseFloat(setupForm.monthlyVolumeLimit) : undefined,
                    chargebackLimitPct: setupForm.chargebackLimitPct ? parseFloat(setupForm.chargebackLimitPct) : undefined,
                    reserveHoldPct: setupForm.reserveHoldPct ? parseFloat(setupForm.reserveHoldPct) : undefined,
                  }, {
                    onSuccess: () => { setShowSetup(false); toast.success('Facility created successfully'); },
                    onError: () => toast.error('Failed to create facility'),
                  });
                }} disabled={!setupForm.merchantId || setupFacility.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {setupFacility.isPending ? 'Creating...' : 'Setup'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── POS Terminals Tab ───────────────────────────────────────────────────────

function TerminalsTab() {
  const { isAdmin } = useAuth();
  const { data: terminals = [], isLoading, isError, error, refetch } = useAllTerminals();
  const registerTerminal = useRegisterTerminal();
  const updateStatus = useUpdateTerminalStatus();
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [regForm, setRegForm] = useState({
    terminalId: '',
    terminalType: 'COUNTERTOP',
    merchantId: '',
    merchantName: '',
    locationAddress: '',
    supportsContactless: true,
    supportsChip: true,
    supportsMagstripe: false,
    supportsPin: true,
    supportsQr: false,
    maxTransactionAmount: '',
    batchSettlementTime: '23:00',
    softwareVersion: '',
  });

  const filteredTerminals = useMemo(() => {
    let result = terminals;
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.operationalStatus === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.terminalId.toLowerCase().includes(q) ||
          t.merchantName.toLowerCase().includes(q) ||
          t.merchantId.toLowerCase().includes(q) ||
          (t.locationAddress && t.locationAddress.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [terminals, statusFilter, searchQuery]);

  const activeCount = terminals.filter((t) => t.operationalStatus === 'ACTIVE').length;

  const statusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'INACTIVE': return 'bg-gray-100 text-gray-600';
      case 'SUSPENDED': return 'bg-amber-100 text-amber-700';
      case 'MAINTENANCE': return 'bg-blue-100 text-blue-700';
      case 'TAMPERED': return 'bg-red-100 text-red-700';
      case 'DECOMMISSIONED': return 'bg-gray-200 text-gray-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isError) {
    return <QueryError message={`Failed to load terminals: ${(error as Error)?.message ?? 'Unknown error'}`} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">{terminals.length} terminals · {activeCount} active</div>

        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'INACTIVE', 'DECOMMISSIONED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Search terminals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isAdmin && (
          <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Register Terminal
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filteredTerminals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {searchQuery || statusFilter !== 'ALL' ? 'No terminals match your filters.' : 'No POS terminals registered'}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b"><tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Terminal ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Merchant</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Capabilities</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Heartbeat</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              {isAdmin && <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>}
            </tr></thead>
            <tbody className="divide-y">
              {filteredTerminals.map((t: PosTerminal) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{t.terminalId}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{t.terminalType}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-medium">{t.merchantName}</div>
                    <div className="text-[10px] text-muted-foreground">{t.merchantId}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs max-w-[150px] truncate">{t.locationAddress ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {t.supportsContactless && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">NFC</span>}
                      {t.supportsChip && <span className="text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded">Chip</span>}
                      {t.supportsPin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">PIN</span>}
                      {t.supportsQr && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">QR</span>}
                      {t.supportsMagstripe && <span className="text-[10px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded">Mag</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {t.lastHeartbeatAt ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Wifi className="w-3 h-3" />
                        {formatDate(t.lastHeartbeatAt)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <WifiOff className="w-3 h-3" />
                        Never
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', statusColor(t.operationalStatus))}>
                      {t.operationalStatus}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {t.operationalStatus === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ terminalId: t.terminalId, status: 'SUSPENDED' }, {
                                onSuccess: () => toast.success(`Terminal ${t.terminalId} suspended`),
                                onError: () => toast.error('Failed to update terminal status'),
                              })}
                              disabled={updateStatus.isPending}
                              className="text-xs text-amber-600 hover:underline font-medium"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ terminalId: t.terminalId, status: 'MAINTENANCE' }, {
                                onSuccess: () => toast.success(`Terminal ${t.terminalId} set to maintenance`),
                                onError: () => toast.error('Failed to update terminal status'),
                              })}
                              disabled={updateStatus.isPending}
                              className="text-xs text-blue-600 hover:underline font-medium ml-2"
                            >
                              Maintenance
                            </button>
                          </>
                        )}
                        {(t.operationalStatus === 'SUSPENDED' || t.operationalStatus === 'MAINTENANCE' || t.operationalStatus === 'INACTIVE') && (
                          <button
                            onClick={() => updateStatus.mutate({ terminalId: t.terminalId, status: 'ACTIVE' }, {
                              onSuccess: () => toast.success(`Terminal ${t.terminalId} activated`),
                              onError: () => toast.error('Failed to update terminal status'),
                            })}
                            disabled={updateStatus.isPending}
                            className="text-xs text-green-600 hover:underline font-medium"
                          >
                            Activate
                          </button>
                        )}
                        {t.operationalStatus !== 'DECOMMISSIONED' && (
                          <button
                            onClick={() => updateStatus.mutate({ terminalId: t.terminalId, status: 'DECOMMISSIONED' }, {
                              onSuccess: () => toast.success(`Terminal ${t.terminalId} decommissioned`),
                              onError: () => toast.error('Failed to decommission terminal'),
                            })}
                            disabled={updateStatus.isPending}
                            className="text-xs text-red-500 hover:underline font-medium ml-2"
                          >
                            Decommission
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Terminal Dialog */}
      {showRegister && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRegister(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Register POS Terminal</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Terminal ID</label>
                    <input value={regForm.terminalId} onChange={(e) => setRegForm((f) => ({ ...f, terminalId: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="POS-001" maxLength={30} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Terminal Type</label>
                    <select value={regForm.terminalType} onChange={(e) => setRegForm((f) => ({ ...f, terminalType: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                      <option value="COUNTERTOP">Countertop</option>
                      <option value="MOBILE">Mobile</option>
                      <option value="VIRTUAL">Virtual</option>
                      <option value="UNATTENDED">Unattended</option>
                      <option value="SOFTPOS">SoftPOS</option>
                      <option value="PIN_PAD">PIN Pad</option>
                      <option value="INTEGRATED">Integrated</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Merchant ID</label>
                    <input value={regForm.merchantId} onChange={(e) => setRegForm((f) => ({ ...f, merchantId: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="MCH-ABCDEF1234" maxLength={80} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Merchant Name</label>
                    <input value={regForm.merchantName} onChange={(e) => setRegForm((f) => ({ ...f, merchantName: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Acme Retail" maxLength={200} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Location Address</label>
                  <input value={regForm.locationAddress} onChange={(e) => setRegForm((f) => ({ ...f, locationAddress: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="123 Main St, Lagos" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Capabilities</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'supportsContactless' as const, label: 'Contactless' },
                      { key: 'supportsChip' as const, label: 'Chip' },
                      { key: 'supportsPin' as const, label: 'PIN' },
                      { key: 'supportsQr' as const, label: 'QR' },
                      { key: 'supportsMagstripe' as const, label: 'Magstripe' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={regForm[key]}
                          onChange={(e) => setRegForm((f) => ({ ...f, [key]: e.target.checked }))}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Max Transaction Amount</label>
                    <input type="number" step="0.01" min={0} value={regForm.maxTransactionAmount}
                      onChange={(e) => setRegForm((f) => ({ ...f, maxTransactionAmount: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Batch Settlement Time</label>
                    <input type="time" value={regForm.batchSettlementTime}
                      onChange={(e) => setRegForm((f) => ({ ...f, batchSettlementTime: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Software Version</label>
                  <input value={regForm.softwareVersion} onChange={(e) => setRegForm((f) => ({ ...f, softwareVersion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="v2.4.1" maxLength={30} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowRegister(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => {
                  registerTerminal.mutate({
                    terminalId: regForm.terminalId,
                    terminalType: regForm.terminalType,
                    merchantId: regForm.merchantId,
                    merchantName: regForm.merchantName,
                    locationAddress: regForm.locationAddress || undefined,
                    supportsContactless: regForm.supportsContactless,
                    supportsChip: regForm.supportsChip,
                    supportsMagstripe: regForm.supportsMagstripe,
                    supportsPin: regForm.supportsPin,
                    supportsQr: regForm.supportsQr,
                    maxTransactionAmount: regForm.maxTransactionAmount ? parseFloat(regForm.maxTransactionAmount) : undefined,
                    batchSettlementTime: regForm.batchSettlementTime || undefined,
                    softwareVersion: regForm.softwareVersion || undefined,
                  }, {
                    onSuccess: () => { setShowRegister(false); toast.success('Terminal registered successfully'); },
                    onError: () => toast.error('Failed to register terminal'),
                  });
                }} disabled={!regForm.terminalId || !regForm.merchantId || !regForm.merchantName || registerTerminal.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {registerTerminal.isPending ? 'Registering...' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; icon: typeof Store }> = [
  { id: 'merchants', label: 'Merchants', icon: Store },
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'settlements', label: 'Settlements', icon: DollarSign },
  { id: 'chargebacks', label: 'Chargebacks', icon: FileWarning },
  { id: 'terminals', label: 'Terminals', icon: Monitor },
  { id: 'pci', label: 'PCI Compliance', icon: Shield },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.id));

export function MerchantAcquiringPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    tabParam && VALID_TABS.has(tabParam) ? (tabParam as Tab) : 'merchants',
  );

  // Sync URL when tab changes
  useEffect(() => {
    const current = searchParams.get('tab');
    if (tab === 'merchants' && !current) return;
    if (current !== tab) {
      setSearchParams(tab === 'merchants' ? {} : { tab }, { replace: true });
    }
  }, [tab, searchParams, setSearchParams]);

  // Sync tab when URL changes externally (e.g. sidebar nav)
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && VALID_TABS.has(urlTab) && urlTab !== tab) {
      setTab(urlTab as Tab);
    } else if (!urlTab && tab !== 'merchants') {
      setTab('merchants');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: allMerchants = [] } = useAllMerchants();
  // High-risk endpoint requires CBS_ADMIN — for officers, derive from allMerchants
  const { data: highRiskApi = [] } = useHighRiskMerchants();
  const highRisk = isAdmin
    ? highRiskApi
    : allMerchants.filter((m) => m.riskCategory === 'HIGH');
  const { data: chargebacks = [] } = useChargebacks();
  const { data: terminals = [] } = useAllTerminals();

  const pendingChargebacks = chargebacks.filter(
    (c) => c.status === 'RECEIVED' || c.status === 'NOTIFIED' || c.status === 'EVIDENCE_REQUESTED',
  ).length;

  const kpis = [
    {
      label: 'Total Merchants',
      value: allMerchants.length,
      icon: Store,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
    },
    {
      label: 'High Risk',
      value: highRisk.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/10',
    },
    {
      label: 'Active Terminals',
      value: terminals.filter((t) => t.operationalStatus === 'ACTIVE').length,
      icon: Monitor,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/10',
    },
    {
      label: 'Chargebacks Pending',
      value: pendingChargebacks,
      icon: FileWarning,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/10',
    },
  ];

  return (
    <>
      <PageHeader
        title="Merchant Acquiring"
        subtitle="Manage merchant onboarding, settlement processing, chargebacks, and PCI compliance."
      />
      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={cn('rounded-xl border p-5', bg)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'merchants' && <MerchantsTab />}
        {tab === 'facilities' && <FacilitiesTab />}
        {tab === 'settlements' && <SettlementsTab />}
        {tab === 'chargebacks' && <ChargebacksTab />}
        {tab === 'terminals' && <TerminalsTab />}
        {tab === 'pci' && <PciComplianceTab />}
      </div>
    </>
  );
}
