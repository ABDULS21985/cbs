import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, Eye, Users, Banknote, Shield, FileText, Download, Upload, Trash2 } from 'lucide-react';
import { useTrust, useTrustDocuments, useUploadTrustDocument, useDeleteTrustDocument } from '../hooks/useWealth';
import { exportTrustStatementPdf } from '../lib/wealthExport';
import { BeneficiaryManager } from '../components/trusts/BeneficiaryManager';
import { DistributionScheduler } from '../components/trusts/DistributionScheduler';
import { TrustComplianceTab } from '../components/trusts/TrustComplianceTab';

// ─── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ trust }: { trust: any }) {
  return (
    <div className="p-6 space-y-6">
      {/* Financial Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Corpus Value', value: formatMoney(trust.corpusValue, trust.currency), color: 'text-foreground' },
          { label: 'Income YTD', value: formatMoney(trust.incomeYtd, trust.currency), color: 'text-green-600 dark:text-green-400' },
          { label: 'Distributions YTD', value: formatMoney(trust.distributionsYtd, trust.currency), color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Annual Fee', value: trust.annualFeePct ? `${trust.annualFeePct}%` : '—', color: 'text-foreground' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={cn('text-xl font-bold font-mono mt-1', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Trust Details Grid */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Trust Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { label: 'Trust Code', value: trust.trustCode },
            { label: 'Trust Type', value: trust.trustType },
            { label: 'Trustee', value: `${trust.trusteeName} (${trust.trusteeType})` },
            { label: 'Currency', value: trust.currency },
            { label: 'Inception Date', value: formatDate(trust.inceptionDate) },
            { label: 'Termination Date', value: trust.terminationDate ? formatDate(trust.terminationDate) : 'N/A' },
            { label: 'Tax ID', value: trust.taxId ?? '—' },
            { label: 'Status', value: trust.status },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-4">
              <dt className="text-xs text-muted-foreground w-32 shrink-0">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Policy */}
      {trust.investmentPolicy && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Investment Policy</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trust.investmentPolicy}</p>
        </div>
      )}

      {/* Distribution Rules */}
      {trust.distributionRules && Object.keys(trust.distributionRules).length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Distribution Rules</h3>
          <div className="space-y-2">
            {Object.entries(trust.distributionRules).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <dt className="text-xs text-muted-foreground w-32 shrink-0 capitalize">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-sm font-medium">{String(value)}</dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────────────────────────

function DocumentsTab({ trustCode }: { trustCode: string }) {
  const { data: documents, isLoading, isError } = useTrustDocuments(trustCode);
  const uploadMutation = useUploadTrustDocument(trustCode);
  const deleteMutation = useDeleteTrustDocument(trustCode);

  function handleUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadMutation.mutate(file);
    };
    input.click();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load documents</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Document
        </button>
      </div>

      {(!documents || documents.length === 0) ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <FileText className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.type} · Uploaded {formatDate(doc.uploadDate)} by {doc.uploadedBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-primary hover:underline">Download</button>
                <button
                  onClick={() => deleteMutation.mutate(doc.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function TrustDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: trust, isLoading } = useTrust(code ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trust) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Trust not found</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={trust.trustName}
        subtitle={`${trust.trustType} Trust · ${trust.trustCode}`}
        backTo="/wealth/trusts"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTrustStatementPdf(trust, [])}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors no-print"
              aria-label="Export trust statement as PDF"
            >
              <Download className="w-4 h-4" />
              Export Statement
            </button>
            <StatusBadge status={trust.status} size="md" dot />
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Quick Stats */}
        <div className="rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Corpus', value: formatMoney(trust.corpusValue, trust.currency) },
              { label: 'Beneficiaries', value: String(trust.beneficiaries?.length ?? 0) },
              { label: 'Distributions YTD', value: formatMoney(trust.distributionsYtd, trust.currency) },
              { label: 'Inception', value: formatDate(trust.inceptionDate) },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold font-mono mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              icon: Eye,
              content: <OverviewTab trust={trust} />,
            },
            {
              id: 'beneficiaries',
              label: 'Beneficiaries',
              icon: Users,
              badge: trust.beneficiaries?.length ?? 0,
              content: (
                <div className="p-6">
                  <BeneficiaryManager
                    trustCode={trust.trustCode}
                    beneficiaries={trust.beneficiaries ?? []}
                    currency={trust.currency}
                  />
                </div>
              ),
            },
            {
              id: 'distributions',
              label: 'Distributions',
              icon: Banknote,
              content: (
                <div className="p-6">
                  <DistributionScheduler trustCode={trust.trustCode} currency={trust.currency} />
                </div>
              ),
            },
            {
              id: 'compliance',
              label: 'Compliance',
              icon: Shield,
              content: (
                <div className="p-6">
                  <TrustComplianceTab trustCode={trust.trustCode} />
                </div>
              ),
            },
            {
              id: 'documents',
              label: 'Documents',
              icon: FileText,
              content: <DocumentsTab trustCode={trust.trustCode} />,
            },
          ]}
        />
      </div>
    </>
  );
}
