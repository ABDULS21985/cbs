import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, FileText, AlertTriangle, CheckCircle2, Clock,
  DollarSign, Ship, Globe, X, Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { tradeFinanceExtApi } from '../api/tradeFinanceExtApi';

// ─── Documents Tab ───────────────────────────────────────────────────────────

function DocumentsTab({ lcId }: { lcId: number }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['trade-finance', 'lc', lcId, 'documents'],
    queryFn: () => tradeFinanceExtApi.getLcDocuments(lcId),
    enabled: !!lcId,
  });
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'INVOICE', fileName: '', fileType: 'PDF', storagePath: '' });
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    setUploading(true);
    tradeFinanceExtApi.uploadDocument({ ...uploadForm, lcId }).then(() => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId, 'documents'] });
      setShowUpload(false);
    }).catch(() => toast.error('Upload failed')).finally(() => setUploading(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </button>
      </div>
      {docs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No documents attached</p></div>
      ) : (
        <div className="space-y-2">
          {docs.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{String(d.fileName ?? `Document ${i + 1}`)}</p>
                <p className="text-xs text-muted-foreground">{String(d.documentCategory ?? '')} • {String(d.fileType ?? '')}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.verificationStatus ? (
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    String(d.verificationStatus) === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                    String(d.verificationStatus) === 'DISCREPANT' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  )}>{String(d.verificationStatus)}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowUpload(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Upload Trade Document</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select className={fc} value={uploadForm.category} onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}>
                  {['INVOICE', 'BILL_OF_LADING', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'INSURANCE_CERT', 'INSPECTION_CERT', 'WEIGHT_CERT', 'CUSTOMS_DECLARATION', 'DRAFT', 'OTHER'].map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">File Name</label><input className={fc} value={uploadForm.fileName} onChange={(e) => setUploadForm((f) => ({ ...f, fileName: e.target.value }))} required /></div>
              <div><label className="text-xs font-medium text-muted-foreground">File Type</label><input className={fc} value={uploadForm.fileType} onChange={(e) => setUploadForm((f) => ({ ...f, fileType: e.target.value }))} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowUpload(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || !uploadForm.fileName} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LcDetailPage() {
  const { id } = useParams<{ id: string }>();
  const lcId = Number(id);

  const { data: lc, isLoading, isError } = useQuery({
    queryKey: ['trade-finance', 'lc', lcId],
    queryFn: () => tradeFinanceExtApi.getLc(lcId),
    enabled: !!lcId,
  });

  const qc = useQueryClient();
  const [showSettle, setShowSettle] = useState(false);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settling, setSettling] = useState(false);

  const handleSettle = () => {
    setSettling(true);
    tradeFinanceExtApi.settleLc(lcId, settleAmount).then(() => {
      toast.success('LC presentation settled');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId] });
      setShowSettle(false);
    }).catch(() => toast.error('Settlement failed')).finally(() => setSettling(false));
  };

  useEffect(() => {
    document.title = lc ? `LC ${lc.lcNumber} | CBS` : 'Letter of Credit | CBS';
  }, [lc]);

  if (isLoading) return <><PageHeader title="Loading..." backTo="/trade-finance" /><div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></>;
  if (isError || !lc) return <><PageHeader title="LC Not Found" backTo="/trade-finance" /><div className="page-container text-center py-20 text-muted-foreground"><AlertTriangle className="w-8 h-8 mx-auto mb-2" /><p>Failed to load letter of credit</p></div></>;

  const available = (lc.amount ?? 0) - (lc.utilizedAmount ?? 0);
  const utilizationPct = lc.amount > 0 ? ((lc.utilizedAmount ?? 0) / lc.amount * 100) : 0;

  const infoItems = [
    { label: 'LC Number', value: lc.lcNumber, mono: true, copyable: true },
    { label: 'Type', value: String(lc.lcType ?? '').replace(/_/g, ' ') },
    { label: 'Role', value: lc.lcRole },
    { label: 'Applicant', value: lc.applicant?.name ?? `#${lc.applicant?.id}` },
    { label: 'Beneficiary', value: lc.beneficiaryName },
    { label: 'Amount', value: lc.amount, format: 'money' as const },
    { label: 'Currency', value: lc.currencyCode },
    { label: 'Utilized', value: lc.utilizedAmount ?? 0, format: 'money' as const },
    { label: 'Issue Date', value: lc.issueDate ? formatDate(lc.issueDate) : '—' },
    { label: 'Expiry Date', value: lc.expiryDate ? formatDate(lc.expiryDate) : '—' },
    { label: 'Payment Terms', value: lc.paymentTerms ?? '—' },
    { label: 'Tenor', value: lc.tenorDays ? `${lc.tenorDays} days` : '—' },
    { label: 'UCP Version', value: lc.ucpVersion ?? 'UCP 600' },
    { label: 'Irrevocable', value: lc.isIrrevocable ? 'Yes' : 'No' },
    { label: 'Confirmed', value: lc.isConfirmed ? 'Yes' : 'No' },
    { label: 'Transferable', value: lc.isTransferable ? 'Yes' : 'No' },
  ];

  const tabs = [
    {
      id: 'details', label: 'Details',
      content: (
        <div className="p-5 space-y-6">
          <section>
            <h3 className="font-semibold mb-3">Parties</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">Beneficiary Bank</span><p className="font-medium">{lc.beneficiaryBankName || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Issuing Bank</span><p className="font-medium">{lc.issuingBankCode || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Advising Bank</span><p className="font-medium">{lc.advisingBankCode || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Confirming Bank</span><p className="font-medium">{lc.confirmingBankCode || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Beneficiary Address</span><p className="font-medium">{lc.beneficiaryAddress || '—'}</p></div>
            </div>
          </section>
          <section>
            <h3 className="font-semibold mb-3">Shipment & Goods</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">Port of Loading</span><p className="font-medium">{lc.portOfLoading || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Port of Discharge</span><p className="font-medium">{lc.portOfDischarge || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Incoterms</span><p className="font-medium">{lc.incoterms || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Latest Shipment Date</span><p className="font-medium">{lc.latestShipmentDate ? formatDate(lc.latestShipmentDate) : '—'}</p></div>
              <div className="col-span-2"><span className="text-xs text-muted-foreground">Goods Description</span><p className="font-medium mt-1">{lc.goodsDescription || '—'}</p></div>
            </div>
          </section>
          <section>
            <h3 className="font-semibold mb-3">Financial</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">Margin %</span><p className="font-medium">{lc.marginPercentage ?? 0}%</p></div>
              <div><span className="text-xs text-muted-foreground">Margin Amount</span><p className="font-mono font-medium">{formatMoney(lc.marginAmount ?? 0)}</p></div>
              <div><span className="text-xs text-muted-foreground">Commission Rate</span><p className="font-medium">{lc.commissionRate ?? 0}%</p></div>
              <div><span className="text-xs text-muted-foreground">Commission Amount</span><p className="font-mono font-medium">{formatMoney(lc.commissionAmount ?? 0)}</p></div>
              <div><span className="text-xs text-muted-foreground">SWIFT Charges</span><p className="font-mono font-medium">{formatMoney(lc.swiftCharges ?? 0)}</p></div>
              <div><span className="text-xs text-muted-foreground">Tolerance +/-</span><p className="font-medium">+{lc.tolerancePositivePct ?? 0}% / -{lc.toleranceNegativePct ?? 0}%</p></div>
            </div>
          </section>
          {(lc.requiredDocuments?.length ?? 0) > 0 && (
            <section>
              <h3 className="font-semibold mb-3">Required Documents</h3>
              <div className="flex flex-wrap gap-2">
                {lc.requiredDocuments?.map((doc: string, i: number) => (
                  <span key={i} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{doc}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      ),
    },
    {
      id: 'documents', label: 'Documents',
      content: <DocumentsTab lcId={lcId} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={`LC ${lc.lcNumber}`}
        subtitle={`${String(lc.lcType ?? '').replace(/_/g, ' ')} • ${lc.beneficiaryName}`}
        backTo="/trade-finance"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={lc.status} size="md" />
            {(lc.status === 'ISSUED' || lc.status === 'ADVISED' || lc.status === 'CONFIRMED' || lc.status === 'PARTIALLY_UTILIZED') && (
              <button onClick={() => { setSettleAmount(available); setShowSettle(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">
                <DollarSign className="w-3.5 h-3.5" /> Settle Presentation
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="LC Amount" value={formatMoney(lc.amount)} icon={DollarSign} />
          <StatCard label="Available" value={formatMoney(available)} icon={CheckCircle2} />
          <StatCard label="Utilized" value={`${utilizationPct.toFixed(1)}%`} icon={Clock} />
          <StatCard label="Currency" value={lc.currencyCode} icon={Globe} />
        </div>

        <div className="card p-6"><InfoGrid items={infoItems} columns={4} /></div>

        <div className="card overflow-hidden"><TabsPage syncWithUrl tabs={tabs} /></div>
      </div>

      {showSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowSettle(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Settle LC Presentation</h3>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Available: <span className="font-mono font-bold">{formatMoney(available)} {lc.currencyCode}</span></p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Settlement Amount</label>
                <input type="number" step="0.01" max={available}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={settleAmount || ''} onChange={(e) => setSettleAmount(Number(e.target.value))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowSettle(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleSettle} disabled={settling || !settleAmount || settleAmount > available}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {settling ? 'Settling...' : 'Settle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
