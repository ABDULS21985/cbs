import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, AlertTriangle, DollarSign, Shield, Clock,
  Globe, X, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { guaranteesApi } from '../api/guaranteeApi';

// Use a flexible type since backend returns full entity
interface GuaranteeDetail {
  id: number;
  guaranteeNumber?: string;
  guaranteeRef?: string;
  guaranteeType?: string;
  applicant?: { id?: number; name?: string } | string;
  beneficiaryName?: string;
  beneficiary?: string;
  beneficiaryAddress?: string;
  amount: number;
  currencyCode?: string;
  currency?: string;
  issueDate?: string;
  expiryDate?: string;
  claimExpiryDate?: string;
  autoExtend?: boolean;
  extensionPeriodDays?: number;
  underlyingContractRef?: string;
  purpose?: string;
  governingLaw?: string;
  isDemandGuarantee?: boolean;
  claimConditions?: string[];
  marginPercentage?: number;
  marginAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  claimedAmount?: number;
  claimAmount?: number;
  status: string;
  [key: string]: unknown;
}

export function GuaranteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bgId = Number(id);

  const { data: bg, isLoading, isError } = useQuery({
    queryKey: ['trade-finance', 'guarantee', bgId],
    queryFn: () => guaranteesApi.getGuarantee(bgId) as unknown as Promise<GuaranteeDetail>,
    enabled: !!bgId,
  });

  const qc = useQueryClient();
  const [showClaim, setShowClaim] = useState(false);
  const [claimAmount, setClaimAmount] = useState(0);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = () => {
    setClaiming(true);
    guaranteesApi.claimGuarantee(bgId, claimAmount).then(() => {
      toast.success('Guarantee claim processed');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'guarantee', bgId] });
      setShowClaim(false);
    }).catch(() => toast.error('Claim failed')).finally(() => setClaiming(false));
  };

  useEffect(() => {
    const ref = bg?.guaranteeNumber ?? bg?.guaranteeRef ?? '';
    document.title = ref ? `BG ${ref} | CBS` : 'Bank Guarantee | CBS';
  }, [bg]);

  if (isLoading) return <><PageHeader title="Loading..." backTo="/trade-finance" /><div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></>;
  if (isError || !bg) return <><PageHeader title="Guarantee Not Found" backTo="/trade-finance" /><div className="page-container text-center py-20 text-muted-foreground"><AlertTriangle className="w-8 h-8 mx-auto mb-2" /><p>Failed to load bank guarantee</p></div></>;

  const claimed = bg.claimedAmount ?? bg.claimAmount ?? 0;
  const availableForClaim = (bg.amount ?? 0) - claimed;
  const bgRef = bg.guaranteeNumber ?? bg.guaranteeRef ?? '';
  const beneficiary = bg.beneficiaryName ?? bg.beneficiary ?? '';
  const ccy = bg.currencyCode ?? bg.currency ?? 'NGN';
  const applicantName = typeof bg.applicant === 'object' && bg.applicant ? (bg.applicant.name ?? `#${bg.applicant.id}`) : String(bg.applicant ?? '—');

  const infoItems = [
    { label: 'Guarantee Number', value: bgRef, mono: true, copyable: true },
    { label: 'Type', value: String(bg.guaranteeType ?? '').replace(/_/g, ' ') },
    { label: 'Applicant', value: applicantName },
    { label: 'Beneficiary', value: beneficiary },
    { label: 'Amount', value: bg.amount, format: 'money' as const },
    { label: 'Currency', value: ccy },
    { label: 'Issue Date', value: bg.issueDate ? formatDate(bg.issueDate) : '—' },
    { label: 'Expiry Date', value: bg.expiryDate ? formatDate(bg.expiryDate) : '—' },
    { label: 'Claim Expiry', value: bg.claimExpiryDate ? formatDate(bg.claimExpiryDate) : '—' },
    { label: 'Auto Extend', value: bg.autoExtend ? `Yes (${bg.extensionPeriodDays ?? 0} days)` : 'No' },
    { label: 'Demand Guarantee', value: bg.isDemandGuarantee ? 'Yes' : 'No' },
    { label: 'Governing Law', value: String(bg.governingLaw ?? '—') },
    { label: 'Contract Ref', value: String(bg.underlyingContractRef ?? '—') },
    { label: 'Margin %', value: `${bg.marginPercentage ?? 0}%` },
    { label: 'Margin Amount', value: bg.marginAmount ?? 0, format: 'money' as const },
    { label: 'Commission Rate', value: `${bg.commissionRate ?? 0}%` },
    { label: 'Commission', value: bg.commissionAmount ?? 0, format: 'money' as const },
    { label: 'Claimed Amount', value: claimed, format: 'money' as const },
    { label: 'Status', value: bg.status },
  ];

  return (
    <>
      <PageHeader
        title={`BG ${bgRef}`}
        subtitle={`${String(bg.guaranteeType ?? '').replace(/_/g, ' ')} • ${beneficiary}`}
        backTo="/trade-finance?tab=guarantees"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={String(bg.status)} size="md" />
            {(String(bg.status) === 'ISSUED' || String(bg.status) === 'ACTIVE' || String(bg.status) === 'PARTIALLY_CLAIMED') && (
              <button onClick={() => { setClaimAmount(availableForClaim); setShowClaim(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Process Claim
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Guarantee Amount" value={formatMoney(bg.amount)} icon={Shield} />
          <StatCard label="Available" value={formatMoney(availableForClaim)} icon={CheckCircle2} />
          <StatCard label="Claimed" value={formatMoney(claimed)} icon={DollarSign} />
          <StatCard label="Currency" value={ccy} icon={Globe} />
        </div>

        <div className="card p-6"><InfoGrid items={infoItems} columns={4} /></div>

        {/* Purpose */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Purpose</h3>
          <p className="text-sm whitespace-pre-wrap">{bg.purpose || '—'}</p>
        </div>

        {/* Claim Conditions */}
        {(bg.claimConditions?.length ?? 0) > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Claim Conditions</h3>
            <div className="space-y-2">
              {bg.claimConditions?.map((cond: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm">{cond}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowClaim(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Process Guarantee Claim</h3>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Available: <span className="font-mono font-bold">{formatMoney(availableForClaim)} {ccy}</span></p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Claim Amount</label>
                <input type="number" step="0.01" max={availableForClaim}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={claimAmount || ''} onChange={(e) => setClaimAmount(Number(e.target.value))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowClaim(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleClaim} disabled={claiming || !claimAmount || claimAmount > availableForClaim}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {claiming ? 'Processing...' : 'Process Claim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
