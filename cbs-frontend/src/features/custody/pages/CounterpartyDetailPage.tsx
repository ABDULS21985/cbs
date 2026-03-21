import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  Shield, AlertTriangle, Loader2, RefreshCw, Check, X,
} from 'lucide-react';
import { counterpartiesApi } from '../api/counterpartyApi';
import { useUpdateCounterpartyExposure } from '../hooks/useCustodyExt';
import { ExposureGauge } from '../components/ExposureGauge';
import { KycReviewPanel } from '../components/KycReviewPanel';
import type { Counterparty } from '../types/counterparty';
import { securitiesFailsApi } from '../api/securitiesFailApi';
import { toast } from 'sonner';

const ratingColor = (r: string) => {
  if (!r) return '';
  const u = r.toUpperCase();
  if (u.startsWith('AAA') || u.startsWith('AA') || u.startsWith('A')) return 'text-green-600';
  if (u.startsWith('BBB')) return 'text-amber-600';
  return 'text-red-600';
};

const riskColors: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function YesNo({ value }: { value: boolean }) {
  return value
    ? <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3.5 h-3.5" /> Yes</span>
    : <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="w-3.5 h-3.5" /> No</span>;
}

// ── Update Exposure Dialog ───────────────────────────────────────────────────

function UpdateExposureDialog({ cp, onClose }: { cp: Counterparty; onClose: () => void }) {
  const update = useUpdateCounterpartyExposure();
  const [amount, setAmount] = useState(cp.currentExposure);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Update Exposure</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">New Exposure Amount</label>
            <input type="number" step="0.01" className="w-full mt-1 input" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Limit: {formatMoney(cp.totalExposureLimit)} | New util: {cp.totalExposureLimit > 0 ? ((amount / cp.totalExposureLimit) * 100).toFixed(1) : 0}%
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => update.mutate({ code: cp.counterpartyCode, exposure: amount }, { onSuccess: () => { toast.success('Exposure updated'); onClose(); } })}
              disabled={update.isPending}
              className="btn-primary"
            >
              {update.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CounterpartyDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [showKyc, setShowKyc] = useState(false);
  const [showExposure, setShowExposure] = useState(false);

  // Fetch counterparty by finding it from the type list
  // Backend doesn't have a GET by code, so we search across types
  const { data: allBanks = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'BANK'],
    queryFn: () => counterpartiesApi.byType('BANK'),
    staleTime: 30_000,
  });
  const { data: allBrokers = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'BROKER_DEALER'],
    queryFn: () => counterpartiesApi.byType('BROKER_DEALER'),
    staleTime: 30_000,
  });
  const { data: allOther = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'CUSTODIAN'],
    queryFn: () => counterpartiesApi.byType('CUSTODIAN'),
    staleTime: 30_000,
  });
  const { data: ccps = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'CCP'],
    queryFn: () => counterpartiesApi.byType('CCP'),
    staleTime: 30_000,
  });
  const { data: corporates = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'CORPORATE'],
    queryFn: () => counterpartiesApi.byType('CORPORATE'),
    staleTime: 30_000,
  });
  const { data: sovereigns = [] } = useQuery({
    queryKey: ['custody', 'counterparties', 'type', 'SOVEREIGN'],
    queryFn: () => counterpartiesApi.byType('SOVEREIGN'),
    staleTime: 30_000,
  });

  const allCps = [...allBanks, ...allBrokers, ...allOther, ...ccps, ...corporates, ...sovereigns];
  const cp = allCps.find((c) => c.counterpartyCode === code);
  const isLoading = allBanks.length === 0 && allBrokers.length === 0;

  // Counterparty fail report: Record<cpName, failCount> — find count for this cp
  const { data: cpReport } = useQuery({
    queryKey: ['custody', 'fails', 'counterparty-report'],
    queryFn: () => securitiesFailsApi.counterpartyReport(),
    staleTime: 60_000,
  });
  const cpFailCount = cpReport ? (cpReport[cp?.counterpartyCode ?? ''] ?? cpReport[cp?.counterpartyName ?? ''] ?? 0) : 0;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/custody/counterparties" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!cp) {
    return (
      <>
        <PageHeader title="Counterparty Not Found" backTo="/custody/counterparties" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No counterparty found with code "{code}"</p>
        </div>
      </>
    );
  }

  const utilPct = cp.totalExposureLimit > 0 ? (cp.currentExposure / cp.totalExposureLimit) * 100 : 0;

  const infoItems = [
    { label: 'Code', value: cp.counterpartyCode },
    { label: 'Name', value: cp.counterpartyName },
    { label: 'Type', value: cp.counterpartyType.replace(/_/g, ' ') },
    { label: 'LEI', value: cp.lei || '--' },
    { label: 'BIC Code', value: cp.bicCode || '--' },
    { label: 'Country', value: cp.country },
    { label: 'Credit Rating', value: cp.creditRating || '--', className: ratingColor(cp.creditRating) },
    { label: 'Rating Agency', value: cp.ratingAgency || '--' },
    { label: 'Risk Category', value: cp.riskCategory },
    { label: 'Total Limit', value: formatMoney(cp.totalExposureLimit) },
    { label: 'Current Exposure', value: formatMoney(cp.currentExposure) },
    { label: 'Available Limit', value: formatMoney(cp.availableLimit) },
    { label: 'Utilization', value: `${utilPct.toFixed(1)}%` },
    { label: 'KYC Status', value: cp.kycStatus },
    { label: 'KYC Review Date', value: cp.kycReviewDate ? formatDate(cp.kycReviewDate) : 'Never' },
    { label: 'Status', value: cp.status },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {cp.counterpartyName}
            <StatusBadge status={cp.counterpartyType} />
            <StatusBadge status={cp.status} dot />
          </span>
        }
        subtitle={<span className="font-mono text-xs">{cp.counterpartyCode}</span>}
        backTo="/custody/counterparties"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowExposure(true)} className="flex items-center gap-2 btn-secondary">
              <RefreshCw className="w-4 h-4" /> Update Exposure
            </button>
            <button onClick={() => setShowKyc(true)} className="flex items-center gap-2 btn-primary">
              <Shield className="w-4 h-4" /> Verify KYC
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Exposure Gauge + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
            <ExposureGauge current={cp.currentExposure} limit={cp.totalExposureLimit} size="lg" />
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Counterparty Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {infoItems.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={cn('font-medium', (item as any).className)}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agreements */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Agreements</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Netting:</span>
              <YesNo value={cp.nettingAgreement} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ISDA:</span>
              <YesNo value={cp.isdaAgreement} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">CSA:</span>
              <YesNo value={cp.csaAgreement} />
            </div>
          </div>
        </div>

        {/* Settlement Instructions */}
        {cp.settlementInstructions && Object.keys(cp.settlementInstructions).length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Settlement Instructions</h3>
            <div className="space-y-1.5">
              {Object.entries(cp.settlementInstructions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1 border-b border-dashed last:border-0">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <span className="text-sm font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Securities Fails */}
        {cpFailCount > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 px-5 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {cpFailCount} open securities fail{cpFailCount !== 1 ? 's' : ''} — view in{' '}
              <a href="/custody/fails" className="underline">Securities Fails</a>
            </p>
          </div>
        )}
      </div>

      {showKyc && <KycReviewPanel counterparty={cp} onClose={() => setShowKyc(false)} />}
      {showExposure && <UpdateExposureDialog cp={cp} onClose={() => setShowExposure(false)} />}
    </>
  );
}
