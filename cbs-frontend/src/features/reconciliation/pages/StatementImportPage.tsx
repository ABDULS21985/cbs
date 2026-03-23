import { useState, useCallback } from 'react';
import {
  Upload,
  Eye,
  Columns3,
  History,
  RefreshCw,
  Server,
  FileText,
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { useNotificationStore } from '@/stores/notificationStore';
import { StatementUploader } from '../components/StatementUploader';
import { StatementPreview } from '../components/StatementPreview';
import { MappingConfigurator } from '../components/MappingConfigurator';
import { ImportHistoryTable } from '../components/ImportHistoryTable';
import {
  useImportHistory,
  useReImportStatement,
  useDeleteImport,
  useAutoFetchConfigs,
} from '../hooks/useReconciliation';
import {
  parseStatement,
  confirmImport,
  rejectImport,
  type ParsedStatement,
} from '../api/reconciliationApi';

type TabId = 'upload' | 'preview' | 'mapping' | 'history' | 'auto-fetch';

const TABS: Array<{ id: TabId; label: string; icon: typeof Upload }> = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'mapping', label: 'Mapping', icon: Columns3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'auto-fetch', label: 'Auto-Fetch', icon: Server },
];

export function StatementImportPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [accountId, setAccountId] = useState('');
  const [parsedStatement, setParsedStatement] = useState<ParsedStatement | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [bankName, setBankName] = useState('');

  // React Query hooks
  const { data: importRecords = [], isLoading: historyLoading, refetch: refetchHistory } = useImportHistory();
  const { data: autoFetchConfigs = [], isLoading: autoFetchLoading } = useAutoFetchConfigs();
  const reImportMutation = useReImportStatement();
  const deleteMutation = useDeleteImport();

  // Handle file upload from StatementUploader
  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const result = await parseStatement(file, accountId);
        setParsedStatement(result);

        // If CSV, extract headers and preview rows for mapping tab
        if (file.name.endsWith('.csv')) {
          const text = await file.text();
          const lines = text.split('\n').filter((l) => l.trim());
          if (lines.length > 0) {
            setCsvHeaders(lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '')));
            setCsvPreviewRows(
              lines.slice(1, 6).map((line) =>
                line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')),
              ),
            );
          }
        }

        setBankName(result.header.bankName);
        setActiveTab('preview');
        addToast({ type: 'success', title: 'Statement Parsed', message: `Parsed ${result.entries.length} entries from ${file.name}.` });
      } catch {
        addToast({ type: 'error', title: 'Parse Failed', message: 'Failed to parse statement file. Check the file format.' });
      }
    },
    [accountId, addToast],
  );

  // Accept & import
  const handleAccept = useCallback(async () => {
    if (!parsedStatement) return;
    try {
      await confirmImport(accountId, parsedStatement.header.statementDate);
      addToast({ type: 'success', title: 'Statement Imported', message: 'Statement confirmed and imported successfully.' });
      setParsedStatement(null);
      setActiveTab('history');
      refetchHistory();
    } catch {
      addToast({ type: 'error', title: 'Import Failed', message: 'Failed to confirm import.' });
    }
  }, [parsedStatement, accountId, addToast, refetchHistory]);

  // Reject
  const handleReject = useCallback(async () => {
    if (!parsedStatement) return;
    try {
      await rejectImport(accountId, parsedStatement.header.statementDate);
      addToast({ type: 'info', title: 'Statement Rejected', message: 'Statement has been rejected.' });
    } catch {
      addToast({ type: 'error', title: 'Reject Failed', message: 'Failed to reject statement.' });
    }
    setParsedStatement(null);
    setActiveTab('upload');
  }, [parsedStatement, accountId, addToast]);

  // Tab change handler
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'history') refetchHistory();
  };

  const handleReImport = useCallback((importId: string) => {
    reImportMutation.mutate(importId, {
      onSuccess: () => addToast({ type: 'success', title: 'Re-Import Started', message: 'Statement re-import initiated.' }),
      onError: () => addToast({ type: 'error', title: 'Re-Import Failed', message: 'Failed to re-import statement.' }),
    });
  }, [reImportMutation, addToast]);

  const handleDeleteImport = useCallback((importId: string) => {
    deleteMutation.mutate(importId, {
      onSuccess: () => addToast({ type: 'success', title: 'Import Deleted', message: 'Import record deleted.' }),
      onError: () => addToast({ type: 'error', title: 'Delete Failed', message: 'Failed to delete import record.' }),
    });
  }, [deleteMutation, addToast]);

  const handleMappingApply = useCallback((_mappings: any[]) => {
    setActiveTab('preview');
  }, []);

  return (
    <>
      <PageHeader
        title="Statement Import"
        subtitle="Upload, parse, and import bank statements for reconciliation"
        backTo="/accounts/reconciliation"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Account:</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Enter account ID..."
              className="rounded-lg border bg-background px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        }
        tabs={
          <div className="flex items-center gap-1 border-b">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="surface-card p-6">
              <h2 className="text-sm font-semibold mb-1">Upload Bank Statement</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Supports CSV, MT940 (.txt), SWIFT XML, and camt.053 formats. Max 10 MB per file.
              </p>

              {!accountId ? (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3.5 py-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Please enter an account ID above before uploading a statement.</p>
                </div>
              ) : (
                <StatementUploader onUpload={handleUpload} accountId={accountId} />
              )}
            </div>

            {/* Format Guide */}
            <div className="surface-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Supported Formats
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { format: 'CSV', desc: 'Comma-separated values with configurable mapping' },
                  { format: 'MT940', desc: 'SWIFT MT940/MT942 statement messages' },
                  { format: 'XML', desc: 'ISO 20022 camt.053 bank-to-customer statement' },
                  { format: 'SWIFT', desc: 'SWIFT FIN statement messages' },
                ].map((f) => (
                  <div key={f.format} className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
                    <p className="font-semibold">{f.format}</p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div>
            {parsedStatement ? (
              <StatementPreview
                statement={parsedStatement}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No Statement to Preview</p>
                <p className="text-xs mt-1">Upload a statement file first to see the parsed preview.</p>
              </div>
            )}
          </div>
        )}

        {/* Mapping Tab */}
        {activeTab === 'mapping' && (
          <div>
            {csvHeaders.length > 0 ? (
              <MappingConfigurator
                csvHeaders={csvHeaders}
                previewRows={csvPreviewRows}
                bankName={bankName}
                onApply={handleMappingApply}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
                <Columns3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No CSV Data Available</p>
                <p className="text-xs mt-1">Upload a CSV statement to configure column mappings.</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Import History</h2>
              <button
                onClick={loadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
            <ImportHistoryTable
              records={importRecords}
              isLoading={historyLoading}
              onReImport={handleReImport}
              onDelete={handleDeleteImport}
            />
          </div>
        )}

        {/* Auto-Fetch Tab */}
        {activeTab === 'auto-fetch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Auto-Fetch Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure automatic statement retrieval via SFTP, SWIFT, or API connections.
                </p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Connection
              </button>
            </div>

            {autoFetchLoading ? (
              <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Loading configurations...
              </div>
            ) : autoFetchConfigs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No Auto-Fetch Connections</p>
                <p className="text-xs mt-1">Configure SFTP or SWIFT connections for automatic statement retrieval.</p>
              </div>
            ) : (
              <div className="surface-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Bank</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Protocol</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Host</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Schedule</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Account Pattern</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last Fetch</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoFetchConfigs.map((config) => (
                        <tr
                          key={config.id}
                          className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-medium">{config.bankName}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-muted">
                              <FileText className="w-3 h-3" />
                              {config.protocol}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{config.host}</td>
                          <td className="px-4 py-3">{config.schedule}</td>
                          <td className="px-4 py-3 font-mono">{config.accountPattern}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {config.lastFetch ? formatDateTime(config.lastFetch) : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {config.status === 'ACTIVE' ? (
                                <Wifi className="w-3.5 h-3.5 text-green-500" />
                              ) : config.status === 'ERROR' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <StatusBadge status={config.status} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
