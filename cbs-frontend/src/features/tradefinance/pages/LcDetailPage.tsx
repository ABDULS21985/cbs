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
import { lcApi } from '../api/lcApi';
import { tradeFinanceExtApi } from '../api/tradeFinanceExtApi';

// Flexible type that works with both full entity and simplified ext API responses
interface LcDetail {
  id: number;
  lcNumber?: string;
  lcRef?: string;
  lcType?: string;
  lcRole?: string;
  applicant?: { id?: number; name?: string } | string;
  beneficiaryName?: string;
  beneficiary?: string;
  beneficiaryAddress?: string;
  beneficiaryBankCode?: string;
  beneficiaryBankName?: string;
  issuingBankCode?: string;
  advisingBankCode?: string;
  confirmingBankCode?: string;
  amount: number;
  currencyCode?: string;
  currency?: string;
  tolerancePositivePct?: number;
  toleranceNegativePct?: number;
  utilizedAmount?: number;
  issueDate?: string;
  issuedAt?: string;
  expiryDate?: string;
  latestShipmentDate?: string;
  tenorDays?: number;
  paymentTerms?: string;
  incoterms?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  goodsDescription?: string;
  requiredDocuments?: string[];
  specialConditions?: string[];
  isIrrevocable?: boolean;
  isConfirmed?: boolean;
  isTransferable?: boolean;
  ucpVersion?: string;
  marginPercentage?: number;
  marginAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  swiftCharges?: number;
  status: string;
  [key: string]: unknown;
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

function DocumentsTab({ lcId }: { lcId: number }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['trade-finance', 'lc', lcId, 'documents'],
    queryFn: () => tradeFinanceExtApi.getLcDocuments(lcId),
    enabled: !!lcId,
  });
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('INVOICE');
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    if (!uploadFile) return;
    setUploading(true);
    tradeFinanceExtApi.uploadDocumentWithFile({ file: uploadFile, category: uploadCategory, lcId }).then(() => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId, 'documents'] });
      setShowUpload(false);
      setUploadFile(null);
      setUploadCategory('INVOICE');
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
            <div key={i} className="flex items-center gap-3 surface-card p-3">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{String(d.fileName ?? `Document ${i + 1}`)}</p>
                <p className="text-xs text-muted-foreground">{String(d.documentCategory ?? '')} • {String(d.fileType ?? '')}</p>
              </div>
              <div className="flex items-center gap-2">
                {d.verificationStatus ? (
                  <span className={cn('ui-chip',
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
                <label className="text-xs font-medium text-muted-foreground">File</label>
                <input type="file" className={fc} onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select className={fc} value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                  {['INVOICE', 'BILL_OF_LADING', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'INSURANCE_CERT', 'INSPECTION_CERT', 'WEIGHT_CERT', 'CUSTOMS_DECLARATION', 'DRAFT', 'OTHER'].map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowUpload(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || !uploadFile} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
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

// ─── Amendments Tab ──────────────────────────────────────────────────────────

function AmendmentsTab({ lcId }: { lcId: number }) {
  const qc = useQueryClient();
  const { data: amendments = [], isLoading } = useQuery({
    queryKey: ['trade-finance', 'lc', lcId, 'amendments'],
    queryFn: () => tradeFinanceExtApi.getLcAmendments(lcId),
    enabled: !!lcId,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amendmentType: 'AMOUNT', oldValue: '', newValue: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    tradeFinanceExtApi.createLcAmendment(lcId, form).then(() => {
      toast.success('Amendment requested');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId, 'amendments'] });
      setShowAdd(false);
      setForm({ amendmentType: 'AMOUNT', oldValue: '', newValue: '', description: '' });
    }).catch(() => toast.error('Failed')).finally(() => setSubmitting(false));
  };

  const handleApprove = (id: number) => {
    tradeFinanceExtApi.approveLcAmendment(lcId, id).then(() => {
      toast.success('Amendment approved');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId] });
    }).catch(() => toast.error('Failed'));
  };

  const handleReject = (id: number) => {
    tradeFinanceExtApi.rejectLcAmendment(lcId, id).then(() => {
      toast.success('Amendment rejected');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId] });
    }).catch(() => toast.error('Failed'));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Request Amendment
        </button>
      </div>
      {amendments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No amendments</p></div>
      ) : (
        <div className="space-y-3">
          {amendments.map((a) => (
            <div key={a.id} className="surface-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">#{a.amendmentNumber}</span>
                  <span className="text-sm font-medium">{String(a.amendmentType ?? '').replace(/_/g, ' ')}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm">{a.description}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {a.oldValue && <span>Old: <span className="font-mono">{a.oldValue}</span></span>}
                {a.newValue && <span>New: <span className="font-mono font-bold">{a.newValue}</span></span>}
              </div>
              {a.status === 'PENDING' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleApprove(a.id)} className="ui-action-chip ui-action-chip-success">Approve</button>
                  <button onClick={() => handleReject(a.id)} className="ui-action-chip ui-action-chip-danger">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Request LC Amendment</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Type</label>
                <select className={fc} value={form.amendmentType} onChange={(e) => setForm((f) => ({ ...f, amendmentType: e.target.value }))}>
                  {['AMOUNT', 'EXPIRY_DATE', 'BENEFICIARY', 'GOODS_DESCRIPTION', 'DOCUMENTS', 'SHIPMENT_DATE', 'OTHER'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Old Value</label><input className={fc} value={form.oldValue} onChange={(e) => setForm((f) => ({ ...f, oldValue: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">New Value</label><input className={fc} value={form.newValue} onChange={(e) => setForm((f) => ({ ...f, newValue: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><textarea className={fc} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.description} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Presentations Tab ───────────────────────────────────────────────────────

function PresentationsTab({ lcId }: { lcId: number }) {
  const qc = useQueryClient();
  const { data: presentations = [], isLoading } = useQuery({
    queryKey: ['trade-finance', 'lc', lcId, 'presentations'],
    queryFn: () => tradeFinanceExtApi.getLcPresentations(lcId),
    enabled: !!lcId,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ documentsPresented: '' as string, amountClaimed: 0 });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    const docs = form.documentsPresented.split(',').map((d) => d.trim()).filter(Boolean);
    tradeFinanceExtApi.createLcPresentation(lcId, { documentsPresented: docs, amountClaimed: form.amountClaimed }).then(() => {
      toast.success('Presentation submitted');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId, 'presentations'] });
      setShowAdd(false);
    }).catch(() => toast.error('Failed')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> New Presentation
        </button>
      </div>
      {presentations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No document presentations</p></div>
      ) : (
        <div className="space-y-3">
          {presentations.map((p) => (
            <div key={p.id} className="surface-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">Presentation #{p.presentationNumber}</span>
                  <span className="text-xs">{formatDate(p.presentedDate)}</span>
                </div>
                <StatusBadge status={p.examinationStatus} />
              </div>
              <div className="flex gap-4 text-sm">
                <span>Amount Claimed: <span className="font-mono font-bold">{formatMoney(p.amountClaimed)}</span></span>
                {p.settlementAmount != null && <span>Settled: <span className="font-mono font-bold">{formatMoney(p.settlementAmount)}</span></span>}
              </div>
              {p.documentsPresented?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.documentsPresented.map((doc, i) => (
                    <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{doc}</span>
                  ))}
                </div>
              )}
              {p.discrepancies?.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/10 p-2 text-xs text-red-700 dark:text-red-400">
                  <span className="font-medium">Discrepancies:</span> {p.discrepancies.join(', ')}
                  {p.discrepancyWaived && <span className="ml-2 text-green-600 font-medium">(Waived)</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Submit Document Presentation</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Amount Claimed</label><input type="number" step="0.01" className={fc} value={form.amountClaimed || ''} onChange={(e) => setForm((f) => ({ ...f, amountClaimed: Number(e.target.value) }))} required /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Documents Presented (comma-separated)</label>
                <textarea className={fc} rows={3} value={form.documentsPresented} onChange={(e) => setForm((f) => ({ ...f, documentsPresented: e.target.value }))}
                  placeholder="Bill of Lading, Commercial Invoice, Packing List" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.amountClaimed} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit'}
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
    queryFn: () => lcApi.getLC(lcId) as unknown as Promise<LcDetail>,
    enabled: !!lcId,
  });

  const qc = useQueryClient();
  const [showSettle, setShowSettle] = useState(false);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settling, setSettling] = useState(false);

  const handleSettle = () => {
    setSettling(true);
    lcApi.settleLC(lcId, settleAmount).then(() => {
      toast.success('LC presentation settled');
      qc.invalidateQueries({ queryKey: ['trade-finance', 'lc', lcId] });
      setShowSettle(false);
    }).catch(() => toast.error('Settlement failed')).finally(() => setSettling(false));
  };

  useEffect(() => {
    const ref = lc?.lcNumber ?? lc?.lcRef ?? '';
    document.title = ref ? `LC ${ref} | CBS` : 'Letter of Credit | CBS';
  }, [lc]);

  if (isLoading) return <><PageHeader title="Loading..." backTo="/trade-finance" /><div className="page-container flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></>;
  if (isError || !lc) return <><PageHeader title="LC Not Found" backTo="/trade-finance" /><div className="page-container text-center py-20 text-muted-foreground"><AlertTriangle className="w-8 h-8 mx-auto mb-2" /><p>Failed to load letter of credit</p></div></>;

  const lcRef = lc.lcNumber ?? lc.lcRef ?? '';
  const ccy = lc.currencyCode ?? lc.currency ?? 'NGN';
  const utilized = lc.utilizedAmount ?? 0;
  const available = (lc.amount ?? 0) - utilized;
  const utilizationPct = lc.amount > 0 ? (utilized / lc.amount * 100) : 0;
  const beneficiary = lc.beneficiaryName ?? lc.beneficiary ?? '';
  const applicantName = typeof lc.applicant === 'object' && lc.applicant ? (lc.applicant.name ?? `#${lc.applicant.id}`) : String(lc.applicant ?? '—');
  const issued = lc.issueDate ?? lc.issuedAt ?? '';

  const infoItems = [
    { label: 'LC Number', value: lcRef, mono: true, copyable: true },
    { label: 'Type', value: String(lc.lcType ?? '').replace(/_/g, ' ') },
    { label: 'Role', value: String(lc.lcRole ?? '—') },
    { label: 'Applicant', value: applicantName },
    { label: 'Beneficiary', value: beneficiary },
    { label: 'Amount', value: lc.amount, format: 'money' as const },
    { label: 'Currency', value: ccy },
    { label: 'Utilized', value: utilized, format: 'money' as const },
    { label: 'Issue Date', value: issued ? formatDate(issued) : '—' },
    { label: 'Expiry Date', value: lc.expiryDate ? formatDate(lc.expiryDate) : '—' },
    { label: 'Payment Terms', value: String(lc.paymentTerms ?? '—') },
    { label: 'Tenor', value: lc.tenorDays ? `${lc.tenorDays} days` : '—' },
    { label: 'UCP Version', value: String(lc.ucpVersion ?? 'UCP 600') },
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
              <div><span className="text-xs text-muted-foreground">Beneficiary Bank</span><p className="font-medium">{String(lc.beneficiaryBankName ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Issuing Bank</span><p className="font-medium">{String(lc.issuingBankCode ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Advising Bank</span><p className="font-medium">{String(lc.advisingBankCode ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Confirming Bank</span><p className="font-medium">{String(lc.confirmingBankCode ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Beneficiary Address</span><p className="font-medium">{String(lc.beneficiaryAddress ?? '—')}</p></div>
            </div>
          </section>
          <section>
            <h3 className="font-semibold mb-3">Shipment & Goods</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">Port of Loading</span><p className="font-medium">{String(lc.portOfLoading ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Port of Discharge</span><p className="font-medium">{String(lc.portOfDischarge ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Incoterms</span><p className="font-medium">{String(lc.incoterms ?? '—')}</p></div>
              <div><span className="text-xs text-muted-foreground">Latest Shipment Date</span><p className="font-medium">{lc.latestShipmentDate ? formatDate(String(lc.latestShipmentDate)) : '—'}</p></div>
              <div className="col-span-2"><span className="text-xs text-muted-foreground">Goods Description</span><p className="font-medium mt-1">{String(lc.goodsDescription ?? '—')}</p></div>
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
      id: 'amendments', label: 'Amendments',
      content: <AmendmentsTab lcId={lcId} />,
    },
    {
      id: 'presentations', label: 'Presentations',
      content: <PresentationsTab lcId={lcId} />,
    },
    {
      id: 'documents', label: 'Documents',
      content: <DocumentsTab lcId={lcId} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={`LC ${lcRef}`}
        subtitle={`${String(lc.lcType ?? '').replace(/_/g, ' ')} • ${beneficiary}`}
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
          <StatCard label="Currency" value={ccy} icon={Globe} />
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
              <p className="text-xs text-muted-foreground">Available: <span className="font-mono font-bold">{formatMoney(available)} {ccy}</span></p>
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
