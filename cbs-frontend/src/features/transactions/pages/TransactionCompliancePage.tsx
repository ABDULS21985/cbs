import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { complianceReportApi } from '../api/complianceReportApi';

function todayStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionCompliancePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayStamp());
  const [threshold, setThreshold] = useState('5000000');
  const [channel, setChannel] = useState('');
  const [month, setMonth] = useState(todayStamp().slice(0, 7) + '-01');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      threshold: threshold ? Number(threshold) : undefined,
      channel: channel || undefined,
      month: month || undefined,
    }),
    [channel, from, month, threshold, to],
  );

  const runDownload = async (key: string, action: () => Promise<void>) => {
    setLoadingKey(key);
    try {
      await action();
      toast.success('Report download started');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Transaction Compliance"
        subtitle="Generate NIBSS, CTR, STR, FIRS, and large value transaction reports."
      />

      <div className="page-container space-y-5">
        <div className="grid gap-4 surface-card p-5 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">From Date</label>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">To Date</label>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Threshold</label>
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Channel</label>
            <select value={channel} onChange={(event) => setChannel(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">All Channels</option>
              <option value="MOBILE">Mobile</option>
              <option value="WEB">Web</option>
              <option value="ATM">ATM</option>
              <option value="POS">POS</option>
              <option value="USSD">USSD</option>
              <option value="BRANCH">Branch</option>
              <option value="AGENT">Agent</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">FIRS Month</label>
            <input type="date" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { key: 'nip', label: 'Generate NIP Report', run: () => complianceReportApi.downloadNipReport(filters) },
            { key: 'ctr', label: 'Generate CTR Report', run: () => complianceReportApi.downloadCtrReport(filters) },
            { key: 'str', label: 'Generate STR Report', run: () => complianceReportApi.downloadStrReport(filters) },
            { key: 'firs', label: 'Generate FIRS Export', run: () => complianceReportApi.downloadFirsExport({ month: filters.month }) },
            { key: 'large', label: 'Large Value Report', run: () => complianceReportApi.downloadLargeValueReport(filters) },
          ].map((action) => (
            <button
              key={action.key}
              onClick={() => void runDownload(action.key, action.run)}
              disabled={loadingKey !== null}
              className="flex items-center justify-between surface-card px-4 py-4 text-left hover:bg-muted/30 disabled:opacity-50"
            >
              <div>
                <p className="font-semibold">{action.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Downloads the current export format directly.</p>
              </div>
              {loadingKey === action.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
