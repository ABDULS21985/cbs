import { useState } from 'react';
import { RefreshCw, Download, Printer, Share2, Loader2, X, Plus, Link } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelative } from '@/lib/formatters';
import { ReportPreview } from './ReportPreview';
import type { SavedReport, ReportResult } from '../../api/reportBuilderApi';

interface ReportExecutionViewProps {
  report: SavedReport;
  result: ReportResult | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ReportExecutionView({ report, result, onRefresh, isLoading }: ReportExecutionViewProps) {
  const [showShare, setShowShare] = useState(false);
  const [shareEmails, setShareEmails] = useState<string[]>([]);
  const [shareEmailInput, setShareEmailInput] = useState('');

  function handleExport(format: 'PDF' | 'EXCEL' | 'CSV') {
    toast.info(`Exporting as ${format}...`);
  }

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/reports/custom/${report.id}/view`;
    void navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }

  function addShareEmail() {
    const trimmed = shareEmailInput.trim();
    if (!trimmed || shareEmails.includes(trimmed)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    setShareEmails([...shareEmails, trimmed]);
    setShareEmailInput('');
  }

  const paramFilters = report.config.filters.filter((f) => f.value === '' || f.value === null);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{report.name}</h2>
          {report.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {report.lastRun && <span>Last run: {formatRelative(report.lastRun)}</span>}
            {result && <span>{result.rowCount.toLocaleString()} rows</span>}
            {result && <span>{new Date(result.runAt).toLocaleTimeString()}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {paramFilters.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
          <span className="font-medium text-amber-800 dark:text-amber-200">Parameters:</span>
          {paramFilters.map((f) => (
            <span key={f.id} className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 text-xs">
              {f.fieldName}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ReportPreview
          result={result}
          vizType={report.config.visualization}
          chartConfig={report.config.chartConfig}
          isLoading={isLoading}
          onRefresh={onRefresh}
          maxRows={result?.rowCount ?? 100}
        />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
        <button
          onClick={() => handleExport('PDF')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={() => handleExport('EXCEL')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
        <button
          onClick={() => handleExport('CSV')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Link className="w-4 h-4" />
          Share Link
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {showShare && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowShare(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Share Report</h3>
                <button onClick={() => setShowShare(false)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Addresses</label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[48px]">
                  {shareEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                      {email}
                      <button onClick={() => setShareEmails(shareEmails.filter((e) => e !== email))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={shareEmailInput}
                    onChange={(e) => setShareEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addShareEmail(); } }}
                    onBlur={addShareEmail}
                    placeholder={shareEmails.length === 0 ? 'Add email addresses...' : 'Add more...'}
                    className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  <button onClick={addShareEmail} className="text-muted-foreground hover:text-primary">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowShare(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { toast.success('Report shared'); setShowShare(false); }}
                  disabled={shareEmails.length === 0}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
