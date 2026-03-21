import { useState, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

/* ---------- types ---------- */

type ChannelOption = '' | 'ALL' | 'MOBILE' | 'WEB' | 'ATM' | 'POS' | 'BRANCH';

interface DownloadState {
  downloading: boolean;
}

/* ---------- helpers ---------- */

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

async function downloadBlob(
  url: string,
  params: Record<string, string | number | undefined>,
  reportName: string,
  defaultFilename: string,
) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  );

  const response = await api.get(url, {
    params: cleanParams,
    responseType: 'blob',
  });

  const contentDisposition = response.headers['content-disposition'];
  const filename =
    contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] || defaultFilename;

  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);

  toast.success(`${reportName} downloaded successfully`);
}

/* ---------- shared sub-components ---------- */

function ChannelSelect({
  value,
  onChange,
}: {
  value: ChannelOption;
  onChange: (v: ChannelOption) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        Channel
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ChannelOption)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Channels</option>
        <option value="ALL">ALL</option>
        <option value="MOBILE">MOBILE</option>
        <option value="WEB">WEB</option>
        <option value="ATM">ATM</option>
        <option value="POS">POS</option>
        <option value="BRANCH">BRANCH</option>
      </select>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
  type = 'date',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'date' | 'month';
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₦
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

function FormatBadge({ format }: { format: 'CSV' | 'XLS' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        format === 'CSV'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      )}
    >
      {format === 'CSV' ? (
        <FileText className="h-3 w-3" />
      ) : (
        <FileSpreadsheet className="h-3 w-3" />
      )}
      {format}
    </span>
  );
}

function DownloadButton({
  onClick,
  downloading,
  disabled,
}: {
  onClick: () => void;
  downloading: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={downloading || disabled}
      className={cn(
        'mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download Report
        </>
      )}
    </button>
  );
}

/* ---------- report card components ---------- */

function NipReportCard() {
  const [dateFrom, setDateFrom] = useState(toDateString(startOfMonth(new Date())));
  const [dateTo, setDateTo] = useState(toDateString(new Date()));
  const [channel, setChannel] = useState<ChannelOption>('');
  const [{ downloading }, setState] = useState<DownloadState>({ downloading: false });

  const handleDownload = useCallback(async () => {
    setState({ downloading: true });
    try {
      await downloadBlob(
        '/api/v1/transactions/compliance/nip-report',
        { from: dateFrom, to: dateTo, channel: channel || undefined },
        'NIP Transaction Report',
        'nip-report.csv',
      );
    } catch {
      toast.error('Failed to generate NIP report');
    } finally {
      setState({ downloading: false });
    }
  }, [dateFrom, dateTo, channel]);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">NIP Transaction Report</h3>
            <p className="text-sm text-muted-foreground">
              NIBSS Instant Payment transactions for regulatory reporting
            </p>
          </div>
        </div>
        <FormatBadge format="CSV" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Date To" value={dateTo} onChange={setDateTo} />
        <ChannelSelect value={channel} onChange={setChannel} />
      </div>

      <DownloadButton onClick={handleDownload} downloading={downloading} />
    </div>
  );
}

function CtrReportCard() {
  const [dateFrom, setDateFrom] = useState(toDateString(startOfMonth(new Date())));
  const [dateTo, setDateTo] = useState(toDateString(new Date()));
  const [threshold, setThreshold] = useState('5000000');
  const [channel, setChannel] = useState<ChannelOption>('');
  const [{ downloading }, setState] = useState<DownloadState>({ downloading: false });

  const handleDownload = useCallback(async () => {
    setState({ downloading: true });
    try {
      await downloadBlob(
        '/api/v1/transactions/compliance/ctr-report',
        {
          from: dateFrom,
          to: dateTo,
          threshold: Number(threshold),
          channel: channel || undefined,
        },
        'Currency Transaction Report',
        'ctr-report.csv',
      );
    } catch {
      toast.error('Failed to generate CTR report');
    } finally {
      setState({ downloading: false });
    }
  }, [dateFrom, dateTo, threshold, channel]);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Currency Transaction Report</h3>
            <p className="text-sm text-muted-foreground">
              Cash transactions exceeding reporting threshold for AML compliance
            </p>
          </div>
        </div>
        <FormatBadge format="CSV" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Date To" value={dateTo} onChange={setDateTo} />
        <ThresholdInput label="Threshold" value={threshold} onChange={setThreshold} />
        <ChannelSelect value={channel} onChange={setChannel} />
      </div>

      <DownloadButton onClick={handleDownload} downloading={downloading} />
    </div>
  );
}

function StrReportCard() {
  const [dateFrom, setDateFrom] = useState(toDateString(startOfMonth(new Date())));
  const [dateTo, setDateTo] = useState(toDateString(new Date()));
  const [channel, setChannel] = useState<ChannelOption>('');
  const [{ downloading }, setState] = useState<DownloadState>({ downloading: false });

  const handleDownload = useCallback(async () => {
    setState({ downloading: true });
    try {
      await downloadBlob(
        '/api/v1/transactions/compliance/str-report',
        { from: dateFrom, to: dateTo, channel: channel || undefined },
        'Suspicious Transaction Report',
        'str-report.csv',
      );
    } catch {
      toast.error('Failed to generate STR report');
    } finally {
      setState({ downloading: false });
    }
  }, [dateFrom, dateTo, channel]);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Suspicious Transaction Report</h3>
            <p className="text-sm text-muted-foreground">
              Flagged transactions requiring regulatory review
            </p>
          </div>
        </div>
        <FormatBadge format="CSV" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Date To" value={dateTo} onChange={setDateTo} />
        <ChannelSelect value={channel} onChange={setChannel} />
      </div>

      <DownloadButton onClick={handleDownload} downloading={downloading} />
    </div>
  );
}

function FirsReportCard() {
  const [month, setMonth] = useState(toDateString(startOfMonth(new Date())));
  const [{ downloading }, setState] = useState<DownloadState>({ downloading: false });

  const handleDownload = useCallback(async () => {
    setState({ downloading: true });
    try {
      // Convert month input (yyyy-MM) to LocalDate (first day of month)
      const monthDate = month.length === 7 ? `${month}-01` : month;
      await downloadBlob(
        '/api/v1/transactions/compliance/firs-export',
        { month: monthDate },
        'FIRS Tax Report',
        'firs-export.csv',
      );
    } catch {
      toast.error('Failed to generate FIRS export');
    } finally {
      setState({ downloading: false });
    }
  }, [month]);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">FIRS Tax Report</h3>
            <p className="text-sm text-muted-foreground">
              Federal Inland Revenue Service tax-related transactions
            </p>
          </div>
        </div>
        <FormatBadge format="CSV" />
      </div>

      <div className="mt-5">
        <DateInput label="Month" value={month} onChange={setMonth} type="month" />
      </div>

      <DownloadButton onClick={handleDownload} downloading={downloading} />
    </div>
  );
}

function LargeValueReportCard() {
  const [dateFrom, setDateFrom] = useState(toDateString(startOfMonth(new Date())));
  const [dateTo, setDateTo] = useState(toDateString(new Date()));
  const [threshold, setThreshold] = useState('10000000');
  const [{ downloading }, setState] = useState<DownloadState>({ downloading: false });

  const handleDownload = useCallback(async () => {
    setState({ downloading: true });
    try {
      await downloadBlob(
        '/api/v1/transactions/compliance/large-value-report',
        { from: dateFrom, to: dateTo, threshold: Number(threshold) },
        'Large Value Transactions',
        'large-value-report.xls',
      );
    } catch {
      toast.error('Failed to generate Large Value report');
    } finally {
      setState({ downloading: false });
    }
  }, [dateFrom, dateTo, threshold]);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Large Value Transactions</h3>
            <p className="text-sm text-muted-foreground">
              Transactions exceeding value threshold for monitoring
            </p>
          </div>
        </div>
        <FormatBadge format="XLS" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DateInput label="Date From" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Date To" value={dateTo} onChange={setDateTo} />
        <ThresholdInput label="Threshold" value={threshold} onChange={setThreshold} />
      </div>

      <DownloadButton onClick={handleDownload} downloading={downloading} />
    </div>
  );
}

/* ---------- main page ---------- */

export function ComplianceDownloadsPage() {
  document.title = 'Compliance Downloads | CBS';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Regulatory Downloads"
        subtitle="Generate and download regulatory compliance reports"
      />

      {/* summary */}
      <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-card-foreground">5</span> compliance
          reports available for download
        </p>
      </div>

      {/* report cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <NipReportCard />
        <CtrReportCard />
        <StrReportCard />
        <FirsReportCard />
        <LargeValueReportCard />
      </div>
    </div>
  );
}
