import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useActiveMerchants,
  useHighRiskMerchants,
  useChargebacks,
  usePciCompliance,
  useOnboardMerchant,
  useActivateMerchant,
  useSuspendMerchant,
  useMerchantSettlements,
  useProcessSettlement,
  useRecordChargeback,
  useSetupFacility,
  useActivateFacility,
  useSubmitRepresentment,
  useMerchantFacilities,
} from '../hooks/useAcquiring';
import { useAcquiringFacilities } from '../hooks/useAcquiringExt';
import type { RiskCategory, ChargebackStatus, Merchant } from '../api/acquiringApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'merchants' | 'facilities' | 'settlements' | 'chargebacks' | 'pci';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(n?: number, currency = 'USD') {
  if (n === undefined || n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

const RISK_BADGE: Record<RiskCategory, string> = {
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CHARGEBACK_STATUS_BADGE: Record<ChargebackStatus, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  REPRESENTMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-muted text-muted-foreground',
};

// ─── Onboard Merchant Dialog ──────────────────────────────────────────────────

interface OnboardDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    businessName: string;
    registrationNumber: string;
    mcc: string;
    contactEmail: string;
    bankAccountId: number;
    riskCategory: RiskCategory;
  }) => void;
  isPending: boolean;
}

function OnboardDialog({ open, onClose, onSubmit, isPending }: OnboardDialogProps) {
  const [form, setForm] = useState({
    businessName: '',
    registrationNumber: '',
    mcc: '',
    contactEmail: '',
    bankAccountId: '',
    riskCategory: 'LOW' as RiskCategory,
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      bankAccountId: parseInt(form.bankAccountId, 10),
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Name</label>
              <input
                required
                className={inputCls}
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                placeholder="Acme Retail Ltd"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Registration Number
              </label>
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
                  maxLength={4}
                  className={inputCls}
                  value={form.mcc}
                  onChange={(e) => setForm((f) => ({ ...f, mcc: e.target.value }))}
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bank Account ID</label>
              <input
                required
                type="number"
                min={1}
                className={inputCls}
                value={form.bankAccountId}
                onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))}
                placeholder="Account ID"
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
  onSuspend: (id: number, reason: string) => void;
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
                  Suspending <strong>{merchant.businessName}</strong>. Provide a reason.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
              <textarea
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Compliance violation, fraud risk, etc."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                disabled={!reason.trim() || isPending}
                onClick={() => onSuspend(merchant.id, reason)}
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

// ─── Merchants Tab ────────────────────────────────────────────────────────────

function MerchantsTab() {
  const { data: active = [], isLoading: loadingActive } = useActiveMerchants();
  const { data: highRisk = [] } = useHighRiskMerchants();
  const { mutate: onboard, isPending: onboarding } = useOnboardMerchant();
  const { mutate: activate, isPending: activating } = useActivateMerchant();
  const { mutate: suspend, isPending: suspending } = useSuspendMerchant();
  const [showOnboard, setShowOnboard] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Merchant | null>(null);

  const highRiskIds = new Set(highRisk.map((m) => m.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} active merchants — {highRisk.length} high-risk flagged
        </p>
        <button
          onClick={() => setShowOnboard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Onboard Merchant
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loadingActive ? (
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Last Settlement</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {active.map((m) => (
                  <tr
                    key={m.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors',
                      highRiskIds.has(m.id) && 'bg-red-50/30 dark:bg-red-900/5',
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.businessName}</div>
                      <div className="text-xs text-muted-foreground">{m.registrationNumber}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{m.mcc}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          RISK_BADGE[m.riskCategory],
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
                          m.status === 'ACTIVE' ? 'text-green-600' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            m.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400',
                          )}
                        />
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground text-xs">
                      {m.terminalCount ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(m.lastSettlementDate)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {m.status !== 'ACTIVE' && (
                          <button
                            onClick={() => activate(m.id)}
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
                  </tr>
                ))}
                {active.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No active merchants found.
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
        onSubmit={(payload) => onboard(payload, { onSuccess: () => setShowOnboard(false) })}
        isPending={onboarding}
      />
      <SuspendDialog
        open={!!suspendTarget}
        merchant={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onSuspend={(id, reason) =>
          suspend({ id, reason }, { onSuccess: () => setSuspendTarget(null) })
        }
        isPending={suspending}
      />
    </div>
  );
}

// ─── Settlements Tab ──────────────────────────────────────────────────────────

function SettlementsTab() {
  const { data: merchants = [] } = useActiveMerchants();
  const [selectedMerchantId, setSelectedMerchantId] = useState<number | null>(null);
  const { data: settlements = [], isLoading } = useMerchantSettlements(selectedMerchantId ?? 0);
  const { mutate: processSettlement, isPending: processing } = useProcessSettlement();
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [processForm, setProcessForm] = useState({ fromDate: '', toDate: '' });

  const handleProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantId) return;
    processSettlement(
      { merchantId: selectedMerchantId, fromDate: processForm.fromDate, toDate: processForm.toDate },
      { onSuccess: () => setShowProcessForm(false) },
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
              {m.businessName}
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
            <input
              required
              type="date"
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={processForm.fromDate}
              onChange={(e) => setProcessForm((f) => ({ ...f, fromDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
            <input
              required
              type="date"
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={processForm.toDate}
              onChange={(e) => setProcessForm((f) => ({ ...f, toDate: e.target.value }))}
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
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Period</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Gross</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Fees</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Net</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(s.fromDate)} – {formatDate(s.toDate)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatAmount(s.grossAmount, s.currency)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground text-xs">
                      {formatAmount(s.fees, s.currency)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-green-600">
                      {formatAmount(s.netAmount, s.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium',
                          s.status === 'COMPLETED'
                            ? 'text-green-600'
                            : s.status === 'FAILED'
                              ? 'text-red-500'
                              : 'text-amber-600',
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(s.processedAt)}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
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

interface RepresentmentDialogProps {
  open: boolean;
  chargebackId: number | null;
  onClose: () => void;
  onSubmit: (id: number, evidence: string, amount: number) => void;
  isPending: boolean;
}

function RepresentmentDialog({ open, chargebackId, onClose, onSubmit, isPending }: RepresentmentDialogProps) {
  const [evidence, setEvidence] = useState('');
  const [amount, setAmount] = useState('');
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
              onSubmit(chargebackId, evidence, parseFloat(amount));
            }}
            className="p-6 space-y-4"
          >
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Representment Amount</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
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

function ChargebacksTab() {
  const { data: chargebacks = [], isLoading } = useChargebacks();
  const { mutate: submitRepresentment, isPending: submitting } = useRecordChargeback();
  const [representmentTarget, setRepresentmentTarget] = useState<number | null>(null);

  const openCount = chargebacks.filter((c) => c.status === 'OPEN').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {openCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              {openCount} open chargeback{openCount !== 1 ? 's' : ''} require attention
            </span>
          </div>
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Transaction Ref</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Merchant</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Reason</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Filed</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chargebacks.map((cb) => (
                  <tr key={cb.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {cb.transactionRef}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">{cb.merchantName ?? `Merchant #${cb.merchantId}`}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {formatAmount(cb.amount, cb.currency)}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                      {cb.reason}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          CHARGEBACK_STATUS_BADGE[cb.status],
                        )}
                      >
                        {cb.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(cb.createdAt)}</td>
                    <td className="px-5 py-3">
                      {(cb.status === 'OPEN' || cb.status === 'REPRESENTMENT') && (
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
                {chargebacks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No chargebacks recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RepresentmentDialog
        open={representmentTarget !== null}
        chargebackId={representmentTarget}
        onClose={() => setRepresentmentTarget(null)}
        onSubmit={(_id, evidence, amount) =>
          submitRepresentment(
            { merchantId: 0, transactionRef: '', amount, reason: evidence },
            { onSuccess: () => setRepresentmentTarget(null) },
          )
        }
        isPending={submitting}
      />
    </div>
  );
}

// ─── PCI Compliance Tab ───────────────────────────────────────────────────────

function PciComplianceTab() {
  const { data: report, isLoading } = usePciCompliance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed py-20 text-center text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No PCI compliance report available.</p>
      </div>
    );
  }

  const isCompliant = report.overallStatus === 'COMPLIANT';
  const isInProgress = report.overallStatus === 'IN_PROGRESS';

  const findingGroups = [
    { label: 'Critical', count: report.criticalFindings, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
    { label: 'High', count: report.highFindings, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
    { label: 'Medium', count: report.mediumFindings, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Low', count: report.lowFindings, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <div
        className={cn(
          'rounded-xl border p-5 flex items-center gap-4',
          isCompliant
            ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
            : isInProgress
              ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'
              : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800',
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
            isCompliant
              ? 'bg-green-100 dark:bg-green-900/30'
              : isInProgress
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-red-100 dark:bg-red-900/30',
          )}
        >
          {isCompliant ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : isInProgress ? (
            <RefreshCw className="w-6 h-6 text-amber-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">
            PCI DSS {report.complianceLevel} —{' '}
            <span
              className={cn(
                isCompliant ? 'text-green-700' : isInProgress ? 'text-amber-700' : 'text-red-700',
              )}
            >
              {report.overallStatus.replace('_', ' ')}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last audit: {formatDate(report.lastAuditDate)} · Next audit: {formatDate(report.nextAuditDate)}
            {report.assessorName && ` · Assessor: ${report.assessorName}`}
            {report.reportRef && ` · Ref: ${report.reportRef}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{report.totalFindings}</p>
          <p className="text-xs text-muted-foreground">Total Findings</p>
        </div>
      </div>

      {/* Findings Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {findingGroups.map(({ label, count, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4', bg)}>
            <p className="text-xs font-medium text-muted-foreground">{label} Severity</p>
            <p className={cn('text-3xl font-bold mt-1 tabular-nums', color)}>{count}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-xl border bg-card p-5">
        <h4 className="text-sm font-semibold mb-3">Compliance Details</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Compliance Level</dt>
            <dd className="font-medium mt-0.5">{report.complianceLevel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Overall Status</dt>
            <dd className="font-medium mt-0.5">{report.overallStatus.replace('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last Audit</dt>
            <dd className="font-medium mt-0.5">{formatDate(report.lastAuditDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Next Audit</dt>
            <dd className="font-medium mt-0.5">{formatDate(report.nextAuditDate)}</dd>
          </div>
          {report.assessorName && (
            <div>
              <dt className="text-xs text-muted-foreground">Assessor</dt>
              <dd className="font-medium mt-0.5">{report.assessorName}</dd>
            </div>
          )}
          {report.reportRef && (
            <div>
              <dt className="text-xs text-muted-foreground">Report Reference</dt>
              <dd className="font-mono text-xs mt-0.5 bg-muted px-1.5 py-0.5 rounded inline-block">
                {report.reportRef}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// ─── Facilities Tab ──────────────────────────────────────────────────────────

function FacilitiesTab() {
  const { data: facilities = [], isLoading } = useAcquiringFacilities();
  const { data: merchants = [] } = useActiveMerchants();
  const setupFacility = useSetupFacility();
  const activateFacility = useActivateFacility();
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ merchantId: 0, settlementCycle: 'DAILY', mdrRatePct: 1.5 });

  const activeCount = facilities.filter((f: Record<string, unknown>) => f.status === 'ACTIVE').length;

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
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Settlement</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">MDR %</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {facilities.map((f: Record<string, unknown>) => (
                <tr key={Number(f.id)} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">Merchant #{String(f.merchantId)}</td>
                  <td className="px-4 py-2.5 text-xs">{String(f.settlementCycle ?? '—')}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{Number(f.mdrRatePct ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-2.5 text-xs">{String(f.facilityType ?? '—')}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                      f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {String(f.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {f.status !== 'ACTIVE' && (
                      <button onClick={() => activateFacility.mutate(Number(f.id))}
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
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Setup Acquiring Facility</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Merchant</label>
                  <select value={setupForm.merchantId} onChange={(e) => setSetupForm((f) => ({ ...f, merchantId: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value={0}>Select merchant...</option>
                    {merchants.map((m: Merchant) => <option key={m.id} value={m.id}>{m.merchantName ?? m.businessName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Settlement Frequency</label>
                  <select value={setupForm.settlementCycle} onChange={(e) => setSetupForm((f) => ({ ...f, settlementCycle: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">MDR Rate (%)</label>
                  <input type="number" step="0.01" value={setupForm.mdrRatePct}
                    onChange={(e) => setSetupForm((f) => ({ ...f, mdrRatePct: parseFloat(e.target.value) || 0 }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowSetup(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => {
                  setupFacility.mutate(setupForm, { onSuccess: () => setShowSetup(false) });
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; icon: typeof Store }> = [
  { id: 'merchants', label: 'Merchants', icon: Store },
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'settlements', label: 'Settlements', icon: DollarSign },
  { id: 'chargebacks', label: 'Chargebacks', icon: FileWarning },
  { id: 'pci', label: 'PCI Compliance', icon: Shield },
];

export function MerchantAcquiringPage() {
  const [tab, setTab] = useState<Tab>('merchants');
  const { data: active = [] } = useActiveMerchants();
  const { data: highRisk = [] } = useHighRiskMerchants();
  const { data: chargebacks = [] } = useChargebacks();

  const kpis = [
    {
      label: 'Active Merchants',
      value: active.length,
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
      label: 'Settlements Today',
      value: '—',
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/10',
    },
    {
      label: 'Chargebacks Pending',
      value: chargebacks.filter((c) => c.status === 'OPEN').length,
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
        <div className="flex items-center gap-1 border-b">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'merchants' && <MerchantsTab />}
        {tab === 'facilities' && <FacilitiesTab />}
        {tab === 'settlements' && <SettlementsTab />}
        {tab === 'chargebacks' && <ChargebacksTab />}
        {tab === 'pci' && <PciComplianceTab />}
      </div>
    </>
  );
}
