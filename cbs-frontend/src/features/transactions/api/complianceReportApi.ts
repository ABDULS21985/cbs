import api from '@/lib/api';

export interface ComplianceReportFilters {
  from?: string;
  to?: string;
  threshold?: number;
  channel?: string;
  month?: string;
}

function buildFilenameFromResponse(contentDisposition: string | undefined, fallback: string) {
  const match = String(contentDisposition ?? '').match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

async function download(url: string, params: Record<string, unknown> | ComplianceReportFilters, fallback: string) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const filename = buildFilenameFromResponse(response.headers['content-disposition'], fallback);
  const blob = new Blob([response.data], { type: String(response.headers['content-type'] ?? 'application/octet-stream') });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const complianceReportApi = {
  downloadNipReport: (filters: ComplianceReportFilters) =>
    download('/api/v1/transactions/compliance/nip-report', filters, 'nip-report.csv'),
  downloadCtrReport: (filters: ComplianceReportFilters) =>
    download('/api/v1/transactions/compliance/ctr-report', filters, 'ctr-report.csv'),
  downloadStrReport: (filters: ComplianceReportFilters) =>
    download('/api/v1/transactions/compliance/str-report', filters, 'str-report.csv'),
  downloadFirsExport: (filters: ComplianceReportFilters) =>
    download('/api/v1/transactions/compliance/firs-export', filters, 'firs-export.csv'),
  downloadLargeValueReport: (filters: ComplianceReportFilters) =>
    download('/api/v1/transactions/compliance/large-value-report', filters, 'large-value-report.xls'),
};
