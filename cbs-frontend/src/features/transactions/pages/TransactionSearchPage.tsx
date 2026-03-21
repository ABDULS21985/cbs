import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Search,
  Table2,
  TimerReset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import '@/lib/export/printStyles.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { exportToExcel } from '@/lib/export/excelExport';
import { exportToPdf } from '@/lib/export/pdfExport';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

import { useTransactionSearch } from '../hooks/useTransactionSearch';
import { SavedSearches } from '../components/SavedSearches';
import { BulkActionBar } from '../components/BulkActionBar';
import { TransactionSummaryBar } from '../components/TransactionSummaryBar';
import { TransactionTimeline } from '../components/TransactionTimeline';
import { TransactionSearchForm, getTransactionSearchValidationErrors } from '../components/TransactionSearchForm';
import { TransactionResultsTable } from '../components/TransactionResultsTable';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { StatementGenerator } from '../components/StatementGenerator';
import { SearchFormSkeleton } from '../components/SearchFormSkeleton';
import { TransactionErrorState } from '../components/TransactionErrorState';
import type { Transaction } from '../api/transactionApi';

const LIVE_MODE_STORAGE_KEY = 'transactions:live-mode';
const LIVE_SOUND_STORAGE_KEY = 'transactions:live-sound';
const VIEW_MODE_STORAGE_KEY = 'transactions:view-mode';

type ViewMode = 'table' | 'timeline';
type ExportFormat = 'csv' | 'excel' | 'pdf' | 'statement';

function toLocalDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTransactionAmount(transaction: Transaction): number {
  const amount = transaction.debitAmount ?? transaction.creditAmount ?? 0;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function downloadTextFile(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportTransactionsToCsv(transactions: Transaction[], filenamePrefix: string) {
  const sanitizeCsvCell = (value: unknown) => {
    const text = String(value ?? '')
      .replace(/\r?\n/g, ' ')
      .replace(/^\s*[=+\-@]/, "'$&");
    return `"${text.replaceAll('"', '""')}"`;
  };

  const headers = [
    'Reference',
    'Date/Time',
    'Type',
    'Channel',
    'Status',
    'From Account',
    'From Name',
    'To Account',
    'To Name',
    'Debit',
    'Credit',
    'Fee',
    'Running Balance',
    'Narration',
  ];
  const rows = transactions.map((transaction) => [
    transaction.reference,
    transaction.dateTime,
    transaction.type,
    transaction.channel,
    transaction.status,
    transaction.fromAccount ?? '',
    transaction.fromAccountName ?? '',
    transaction.toAccount ?? '',
    transaction.toAccountName ?? '',
    transaction.debitAmount?.toString() ?? '',
    transaction.creditAmount?.toString() ?? '',
    transaction.fee?.toString() ?? '',
    transaction.runningBalance?.toString() ?? '',
    transaction.narration,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => sanitizeCsvCell(value)).join(','))
    .join('\n');

  downloadTextFile(csv, 'text/csv;charset=utf-8', `${filenamePrefix}-${toLocalDateStamp(new Date())}.csv`);
}

function buildExportRows(transactions: Transaction[]) {
  return transactions.map((transaction) => ({
    reference: transaction.reference,
    dateTime: transaction.dateTime,
    type: transaction.type,
    channel: transaction.channel,
    status: transaction.status,
    fromAccount: transaction.fromAccount ?? '',
    fromAccountName: transaction.fromAccountName ?? '',
    toAccount: transaction.toAccount ?? '',
    toAccountName: transaction.toAccountName ?? '',
    debitAmount: transaction.debitAmount ?? 0,
    creditAmount: transaction.creditAmount ?? 0,
    fee: transaction.fee ?? 0,
    runningBalance: transaction.runningBalance ?? '',
    narration: transaction.narration,
  }));
}

function getStatementMetrics(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return { openingBalance: 0, closingBalance: 0 };
  }

  const chronological = [...transactions].sort(
    (left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime(),
  );
  const oldest = chronological[0];
  const newest = chronological[chronological.length - 1];
  const openingBalance =
    (oldest.runningBalance ?? 0) + (oldest.debitAmount ?? 0) - (oldest.creditAmount ?? 0);
  const closingBalance = newest.runningBalance ?? openingBalance;
  return { openingBalance, closingBalance };
}

function exportStatementPdf(transactions: Transaction[], title: string, periodLabel: string) {
  const { openingBalance, closingBalance } = getStatementMetrics(transactions);
  const rows = [...transactions]
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime())
    .map((transaction) => ({
      date: transaction.postingDate,
      reference: transaction.reference,
      narration: transaction.narration,
      debit: transaction.debitAmount ?? '',
      credit: transaction.creditAmount ?? '',
      balance: transaction.runningBalance ?? '',
    }));

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Unable to open the statement print window.');
    return;
  }

  const bodyRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(String(row.date))}</td>
          <td>${escapeHtml(String(row.reference))}</td>
          <td>${escapeHtml(String(row.narration))}</td>
          <td class="money">${row.debit === '' ? '—' : Number(row.debit).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="money">${row.credit === '' ? '—' : Number(row.credit).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="money">${row.balance === '' ? '—' : Number(row.balance).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `,
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 24px; }
          .brand { font-size: 24px; font-weight: 700; color: #1d4ed8; }
          .subtitle { margin-top: 4px; color: #6b7280; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
          .summary-card h3 { margin: 0 0 4px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
          .summary-card p { margin: 0; font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1d4ed8; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 11px; vertical-align: top; }
          .money { text-align: right; font-family: 'Courier New', Courier, monospace; }
          .footer { margin-top: 18px; font-size: 10px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">BellBank</div>
            <div class="subtitle">${escapeHtml(title)}</div>
            <div class="subtitle">Period: ${escapeHtml(periodLabel)}</div>
          </div>
          <div class="subtitle">Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</div>
        </div>

        <div class="summary">
          <div class="summary-card"><h3>Opening Balance</h3><p>${openingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div class="summary-card"><h3>Closing Balance</h3><p>${closingBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div class="summary-card"><h3>Transactions</h3><p>${transactions.length.toLocaleString()}</p></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Narration</th>
              <th class="money">Debit</th>
              <th class="money">Credit</th>
              <th class="money">Running Balance</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>

        <div class="footer">BellBank CBS | Confidential</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 350);
}

function printResultsReport(transactions: Transaction[], title: string) {
  const rows = buildExportRows(transactions);
  exportToPdf(
    title,
    rows,
    [
      { key: 'dateTime', label: 'Date/Time' },
      { key: 'reference', label: 'Reference' },
      { key: 'type', label: 'Type' },
      { key: 'channel', label: 'Channel' },
      { key: 'status', label: 'Status' },
      { key: 'debitAmount', label: 'Debit' },
      { key: 'creditAmount', label: 'Credit' },
      { key: 'narration', label: 'Narration' },
    ],
    { watermark: 'BellBank' },
  );
}

function printTransactionReceipts(transactions: Transaction[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Unable to open the print window.');
    return;
  }

  const sections = transactions
    .map((transaction) => {
      const amount = formatTransactionAmount(transaction).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `
        <section class="receipt">
          <div class="receipt-header">
            <div>
              <div class="brand">BellBank</div>
              <div class="muted">Transaction Receipt</div>
            </div>
            <div class="status">${escapeHtml(transaction.status)}</div>
          </div>
          <div class="amount">₦${amount}</div>
          <table>
            <tr><td>Reference</td><td>${escapeHtml(transaction.reference)}</td></tr>
            <tr><td>Date &amp; Time</td><td>${escapeHtml(transaction.dateTime)}</td></tr>
            <tr><td>Type</td><td>${escapeHtml(transaction.type)}</td></tr>
            <tr><td>Channel</td><td>${escapeHtml(transaction.channel)}</td></tr>
            <tr><td>From</td><td>${escapeHtml(transaction.fromAccountName ?? transaction.fromAccount ?? 'N/A')}</td></tr>
            <tr><td>To</td><td>${escapeHtml(transaction.toAccountName ?? transaction.toAccount ?? 'N/A')}</td></tr>
            <tr><td>Narration</td><td>${escapeHtml(transaction.narration)}</td></tr>
          </table>
        </section>
      `;
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Selected Transaction Receipts</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .receipt { page-break-after: always; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 18px; }
          .receipt:last-child { page-break-after: auto; }
          .receipt-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 14px; }
          .brand { font-size: 22px; font-weight: 700; color: #1d4ed8; }
          .muted { color: #6b7280; font-size: 12px; }
          .status { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
          .amount { font-size: 28px; font-weight: 700; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; }
          td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; font-size: 12px; }
          td:first-child { color: #6b7280; width: 30%; }
        </style>
      </head>
      <body>${sections}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 350);
}

function buildActiveFilterPills(
  filters: ReturnType<typeof useTransactionSearch>['appliedFilters'],
) {
  const pills: Array<{ key: string; label: string }> = [];
  if (filters.search.trim()) pills.push({ key: 'search', label: `Search: ${filters.search.trim()}` });
  if (filters.accountNumber.trim()) pills.push({ key: 'accountNumber', label: `Account: ${filters.accountNumber.trim()}` });
  if (filters.customerId.trim()) pills.push({ key: 'customerId', label: `Customer: ${filters.customerId.trim()}` });
  if (filters.dateFrom || filters.dateTo) pills.push({ key: 'dateRange', label: `${filters.dateFrom || 'Start'} - ${filters.dateTo || 'Now'}` });
  if (filters.amountFrom > 0 || filters.amountTo > 0) pills.push({ key: 'amountRange', label: `Amount: ${filters.amountFrom || 0} - ${filters.amountTo || 'Any'}` });
  if (filters.type !== 'ALL') pills.push({ key: 'type', label: `Type: ${filters.type}` });
  if (filters.channel !== 'ALL') pills.push({ key: 'channel', label: `Channel: ${filters.channel}` });
  if (filters.status !== 'ALL') pills.push({ key: 'status', label: `Status: ${filters.status}` });
  if (filters.flaggedOnly) pills.push({ key: 'flaggedOnly', label: 'Flagged Only' });

  return pills;
}

function playPing() {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const audioContext = new AudioCtx();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.18);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function hasAnySearchCriteria(current: ReturnType<typeof useTransactionSearch>['filters']) {
  return Boolean(
    current.search.trim() ||
      current.accountNumber.trim() ||
      current.customerId.trim() ||
      current.dateFrom ||
      current.dateTo ||
      current.amountFrom > 0 ||
      current.amountTo > 0 ||
      current.type !== 'ALL' ||
      current.channel !== 'ALL' ||
      current.status !== 'ALL' ||
      current.flaggedOnly,
  );
}

export function TransactionSearchPage() {
  const user = useAuthStore((state) => state.user);
  const [liveMode, setLiveMode] = useState(() => localStorage.getItem(LIVE_MODE_STORAGE_KEY) === 'true');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(LIVE_SOUND_STORAGE_KEY) === 'true');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode) || 'table',
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('UNAUTHORIZED');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [largeExportWarningOpen, setLargeExportWarningOpen] = useState(false);
  const [statementGeneratorOpen, setStatementGeneratorOpen] = useState(false);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const [flashingTransactionIds, setFlashingTransactionIds] = useState<string[]>([]);
  const [transactionsPerMinute, setTransactionsPerMinute] = useState(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previousTransactionIdsRef = useRef<string[]>([]);
  const arrivalTimestampsRef = useRef<number[]>([]);

  const {
    filters,
    appliedFilters,
    updateFilters,
    triggerSearch,
    searchWithFilters,
    resetFilters,
    transactions,
    summary,
    previousSummary,
    comparisonPeriodLabel,
    isLoading,
    isFetching,
    isRefreshing,
    isError,
    error,
    refetch,
    elapsedMs,
    hasSearched,
    isReady,
    savedSearches,
    recentSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    applySavedSearch,
    applyRecentSearch,
    setPage,
    setPageSize,
    setSort,
    selectedTransactionIds,
    selectedTransactions,
    allVisibleSelected,
    someVisibleSelected,
    toggleTransactionSelection,
    toggleAllVisibleTransactions,
    clearSelection,
  } = useTransactionSearch(liveMode ? 10_000 : false);

  const { hasErrors } = useMemo(() => getTransactionSearchValidationErrors(filters), [filters]);
  const roles = user?.roles ?? [];
  const canGenerateStatement = roles.includes('CBS_ADMIN') || roles.includes('CBS_OFFICER') || roles.includes('PORTAL_USER');
  const canFileDispute = roles.includes('CBS_ADMIN') || roles.includes('CBS_OFFICER') || roles.includes('PORTAL_USER');
  const isInitialResultsLoading = isLoading && transactions.length === 0;
  const highlightedIds = useMemo(
    () => Array.from(new Set([...flashingTransactionIds, ...(highlightedTransactionId ? [highlightedTransactionId] : [])])),
    [flashingTransactionIds, highlightedTransactionId],
  );

  const periodLabel = useMemo(() => {
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      return `${appliedFilters.dateFrom || 'Start'} to ${appliedFilters.dateTo || 'Now'}`;
    }
    return 'Current visible result set';
  }, [appliedFilters]);

  const executeExport = useCallback((format: ExportFormat, rows: Transaction[]) => {
    if (rows.length === 0) {
      toast.error('There are no transactions to export.');
      return;
    }

    switch (format) {
      case 'csv':
        exportTransactionsToCsv(rows, rows === transactions ? 'transactions' : 'transactions-selected');
        toast.success('CSV export started');
        return;
      case 'excel':
        exportToExcel(
          buildExportRows(rows),
          [
            { key: 'reference', label: 'Reference' },
            { key: 'dateTime', label: 'Date/Time' },
            { key: 'type', label: 'Type' },
            { key: 'channel', label: 'Channel' },
            { key: 'status', label: 'Status' },
            { key: 'debitAmount', label: 'Debit', format: 'money' },
            { key: 'creditAmount', label: 'Credit', format: 'money' },
            { key: 'runningBalance', label: 'Running Balance', format: 'money' },
            { key: 'narration', label: 'Narration' },
          ],
          rows === transactions ? 'transactions' : 'transactions-selected',
        );
        toast.success('Excel export started');
        return;
      case 'pdf':
        exportToPdf(
          'Transaction History',
          buildExportRows(rows),
          [
            { key: 'dateTime', label: 'Date/Time' },
            { key: 'reference', label: 'Reference' },
            { key: 'type', label: 'Type' },
            { key: 'channel', label: 'Channel' },
            { key: 'status', label: 'Status' },
            { key: 'debitAmount', label: 'Debit' },
            { key: 'creditAmount', label: 'Credit' },
            { key: 'narration', label: 'Narration' },
          ],
          { period: periodLabel, watermark: 'BellBank' },
        );
        toast.success('PDF export opened');
        return;
      case 'statement':
        exportStatementPdf(rows, 'BellBank Transaction Statement', periodLabel);
        toast.success('Statement print view opened');
        return;
    }
  }, [periodLabel, transactions]);

  const handleExportRequest = useCallback((format: ExportFormat, rows: Transaction[] = transactions) => {
    setExportMenuOpen(false);
    if (rows === transactions && summary.totalResults > 1000) {
      setPendingExportFormat(format);
      setLargeExportWarningOpen(true);
      return;
    }
    executeExport(format, rows);
  }, [executeExport, summary.totalResults, transactions]);

  const handlePrintCurrentResults = useCallback(() => {
    if (transactions.length === 0) {
      toast.error('There are no transactions to print.');
      return;
    }
    printResultsReport(transactions, 'Transaction Search Results');
  }, [transactions]);

  const handlePrintSelected = useCallback(() => {
    if (selectedTransactions.length === 0) {
      toast.error('Select at least one transaction first.');
      return;
    }
    printTransactionReceipts(selectedTransactions);
  }, [selectedTransactions]);

  const handleCopyServerSideExportRequest = useCallback(async () => {
    const payload = {
      requestType: 'TRANSACTION_SERVER_SIDE_EXPORT',
      requestedAt: new Date().toISOString(),
      totalMatchingResults: summary.totalResults,
      filters: appliedFilters,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success('Server-side export request copied to clipboard.');
    } catch {
      downloadTextFile(
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8',
        `transaction-export-request-${toLocalDateStamp(new Date())}.json`,
      );
      toast.success('Server-side export request downloaded.');
    }
  }, [appliedFilters, summary.totalResults]);

  const handleExportSelected = useCallback(() => {
    handleExportRequest('csv', selectedTransactions);
  }, [handleExportRequest, selectedTransactions]);

  const handleSubmitBatchDispute = useCallback(() => {
    if (!disputeReason.trim()) {
      toast.error('Enter a dispute reason first.');
      return;
    }

    const rows = selectedTransactions.map((transaction) => ({
      reference: transaction.reference,
      account: transaction.fromAccount ?? transaction.toAccount ?? transaction.accountNumber ?? '',
      amount: formatTransactionAmount(transaction),
      category: disputeCategory,
      reason: disputeReason.trim(),
      status: transaction.status,
      narration: transaction.narration,
    }));

    exportTransactionsToCsv(
      rows.map((row) => ({
        id: row.reference,
        reference: row.reference,
        type: 'DISPUTE',
        channel: '',
        status: row.status,
        dateTime: '',
        valueDate: '',
        postingDate: '',
        accountNumber: row.account,
        narration: row.narration,
        description: `${row.category} - ${row.reason}`,
        debitAmount: row.amount,
      })) as unknown as Transaction[],
      'transaction-dispute-packet',
    );
    toast.success('Batch dispute packet downloaded for operations review.');
    setDisputeModalOpen(false);
    setDisputeReason('');
    setDisputeCategory('UNAUTHORIZED');
  }, [disputeCategory, disputeReason, selectedTransactions]);

  const handleRemoveFilter = useCallback((key: string) => {
    const nextFilters = { ...appliedFilters };
    switch (key) {
      case 'search':
        nextFilters.search = '';
        break;
      case 'accountNumber':
        nextFilters.accountNumber = '';
        break;
      case 'customerId':
        nextFilters.customerId = '';
        break;
      case 'dateRange':
        nextFilters.dateFrom = '';
        nextFilters.dateTo = '';
        break;
      case 'amountRange':
        nextFilters.amountFrom = 0;
        nextFilters.amountTo = 0;
        break;
      case 'type':
        nextFilters.type = 'ALL';
        break;
      case 'channel':
        nextFilters.channel = 'ALL';
        break;
      case 'status':
        nextFilters.status = 'ALL';
        break;
      case 'flaggedOnly':
        nextFilters.flaggedOnly = false;
        break;
      default:
        return;
    }
    searchWithFilters(nextFilters);
  }, [appliedFilters, searchWithFilters]);

  const handleRowClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedTransaction(null);
  }, []);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useEffect(() => {
    document.title = 'Transaction History | CBS';
  }, []);

  useEffect(() => {
    localStorage.setItem(LIVE_MODE_STORAGE_KEY, String(liveMode));
  }, [liveMode]);

  useEffect(() => {
    localStorage.setItem(LIVE_SOUND_STORAGE_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!highlightedTransactionId) return;
    const timeout = window.setTimeout(() => setHighlightedTransactionId(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [highlightedTransactionId]);

  useEffect(() => {
    const currentIds = transactions.map((transaction) => String(transaction.id));

    if (!liveMode) {
      previousTransactionIdsRef.current = currentIds;
      arrivalTimestampsRef.current = [];
      setTransactionsPerMinute(0);
      setFlashingTransactionIds([]);
      return;
    }

    const previousIds = previousTransactionIdsRef.current;
    if (previousIds.length === 0) {
      previousTransactionIdsRef.current = currentIds;
      return;
    }

    const previousSet = new Set(previousIds);
    const newTransactions = transactions.filter((transaction) => !previousSet.has(String(transaction.id)));
    previousTransactionIdsRef.current = currentIds;

    if (newTransactions.length === 0) {
      return;
    }

    const newIds = newTransactions.map((transaction) => String(transaction.id));
    setFlashingTransactionIds((current) => Array.from(new Set([...current, ...newIds])));

    const timeout = window.setTimeout(() => {
      setFlashingTransactionIds((current) => current.filter((id) => !newIds.includes(id)));
    }, 3000);

    const now = Date.now();
    arrivalTimestampsRef.current = [
      ...arrivalTimestampsRef.current.filter((timestamp) => now - timestamp < 60_000),
      ...newIds.map(() => now),
    ];
    setTransactionsPerMinute(arrivalTimestampsRef.current.length);

    if (soundEnabled && newTransactions.some((transaction) => formatTransactionAmount(transaction) > 1_000_000)) {
      playPing();
    }

    return () => window.clearTimeout(timeout);
  }, [liveMode, soundEnabled, transactions]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);

      if (event.key === 'Escape') {
        if (detailOpen) {
          event.preventDefault();
          handleCloseDetail();
          return;
        }
        if (shortcutHelpOpen) {
          event.preventDefault();
          setShortcutHelpOpen(false);
          return;
        }
        if (disputeModalOpen) {
          event.preventDefault();
          setDisputeModalOpen(false);
          return;
        }
        if (selectedTransactionIds.length > 0) {
          event.preventDefault();
          clearSelection();
        }
        return;
      }

      if (!typing && event.key === '?') {
        event.preventDefault();
        setShortcutHelpOpen(true);
        return;
      }

      if (!typing && event.key === '/') {
        event.preventDefault();
        focusSearchInput();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setLiveMode((current) => !current);
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.key.toLowerCase()) {
        case 'enter':
          if (!hasErrors) {
            event.preventDefault();
            triggerSearch();
          }
          return;
        case 'f':
          event.preventDefault();
          focusSearchInput();
          return;
        case 'e':
          event.preventDefault();
          handleExportRequest('csv');
          return;
        case 'p':
          event.preventDefault();
          handlePrintCurrentResults();
          return;
        case 'a':
          if (hasSearched && transactions.length > 0) {
            event.preventDefault();
            toggleAllVisibleTransactions();
          }
          return;
        default:
          return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    clearSelection,
    detailOpen,
    disputeModalOpen,
    focusSearchInput,
    handleCloseDetail,
    handleExportRequest,
    handlePrintCurrentResults,
    hasErrors,
    hasSearched,
    selectedTransactionIds.length,
    shortcutHelpOpen,
    toggleAllVisibleTransactions,
    transactions.length,
    triggerSearch,
  ]);

  const activeFilterPills = useMemo(
    () => buildActiveFilterPills(appliedFilters),
    [appliedFilters],
  );

  const liveWarning = liveMode && transactionsPerMinute > 50;
  const printAccountLabel = appliedFilters.accountNumber || 'All matching accounts';

  const searchAnnouncement = useMemo(() => {
    if (!hasSearched) return '';
    return `Found ${summary.totalResults} transactions. Total debit: ${summary.totalDebit.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}.`;
  }, [hasSearched, summary.totalDebit, summary.totalResults]);

  return (
    <>
      <OfflineBanner />
      <PageHeader
        title="Transaction History"
        subtitle="Search, monitor, export, and investigate transactions from one workstation"
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLiveMode((current) => !current)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                liveMode
                  ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                  : 'hover:bg-muted',
              )}
            >
              <BellRing className="h-4 w-4" />
              {liveMode ? 'Live Mode ON' : 'Live Mode OFF'}
              {liveMode && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            </button>

            <button
              onClick={() => setSoundEnabled((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              title="Toggle live monitor sound"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound
            </button>

            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((current) => !current)}
                disabled={transactions.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 rounded-xl border bg-card p-2 shadow-xl">
                  {[
                    { label: 'Export CSV', format: 'csv' as const, icon: Download },
                    { label: 'Export Excel', format: 'excel' as const, icon: FileSpreadsheet },
                    { label: 'Export PDF', format: 'pdf' as const, icon: FileText },
                    { label: 'Export Statement', format: 'statement' as const, icon: TimerReset },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.format}
                        onClick={() => handleExportRequest(option.format)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {canGenerateStatement && (
              <button
                onClick={() => setStatementGeneratorOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                Generate Statement
              </button>
            )}

            <button
              onClick={() => setShortcutHelpOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              title="Keyboard shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
              Shortcuts
            </button>
          </div>
        }
      />

      <div className="page-container space-y-4">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {searchAnnouncement}
        </div>

        {hasSearched && (
          <>
            <div className="print-only print-header hidden">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-2xl font-bold text-blue-700">BellBank</p>
                  <p className="mt-1 text-lg font-semibold">Transaction History</p>
                  <p className="text-sm text-muted-foreground">Account: {printAccountLabel}</p>
                  <p className="text-sm text-muted-foreground">Period: {periodLabel}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generated: {new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
                </p>
              </div>
            </div>
            <div className="print-only print-footer hidden">CONFIDENTIAL</div>
          </>
        )}

        {!isReady ? (
          <SearchFormSkeleton />
        ) : (
          <div className="no-print">
            <TransactionSearchForm
              filters={filters}
              onChange={updateFilters}
              onSearch={() => triggerSearch()}
              onReset={resetFilters}
              isLoading={isLoading || isFetching}
              searchInputRef={searchInputRef}
            />
          </div>
        )}

        <div className="no-print">
          <ErrorBoundary fallback={<TransactionErrorState error={error} onRetry={() => refetch()} />}>
            <SavedSearches
              savedSearches={savedSearches}
              recentSearches={recentSearches}
              onSaveSearch={saveCurrentSearch}
              onApplySavedSearch={applySavedSearch}
              onDeleteSavedSearch={deleteSavedSearch}
              onApplyRecentSearch={applyRecentSearch}
              canSave={hasAnySearchCriteria(filters) || hasSearched}
            />
          </ErrorBoundary>
        </div>

        {isError && (
          <TransactionErrorState error={error} onRetry={() => refetch()} />
        )}

        {liveWarning && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <span>High transaction velocity detected: {transactionsPerMinute} new transactions in the last minute.</span>
          </div>
        )}

        {hasSearched && !isInitialResultsLoading && !isError && elapsedMs !== null && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Found <span className="font-medium text-foreground">{summary.totalResults.toLocaleString()}</span> transactions in <span className="font-mono text-foreground">{elapsedMs}ms</span>
            </span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Refreshing…
              </span>
            )}
            {liveMode && (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {transactionsPerMinute} new/min
              </span>
            )}
          </div>
        )}

        {hasSearched && (
          <ErrorBoundary fallback={<TransactionErrorState error={error} onRetry={() => refetch()} />}>
            <div className="avoid-break">
              <TransactionSummaryBar
                summary={summary}
                previousSummary={previousSummary}
                comparisonPeriodLabel={comparisonPeriodLabel}
                transactions={transactions}
                isLoading={isInitialResultsLoading}
                onHighlightLargest={setHighlightedTransactionId}
              />
            </div>
          </ErrorBoundary>
        )}

        {hasSearched && (
          <div className="no-print space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterPills.length > 0 ? (
                  <>
                    {activeFilterPills.map((pill) => (
                      <button
                        key={pill.key}
                        onClick={() => handleRemoveFilter(pill.key)}
                        className="no-print inline-flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-1 text-sm transition-colors hover:bg-muted"
                      >
                        {pill.label}
                        <span className="text-muted-foreground">×</span>
                      </button>
                    ))}
                    <button
                      onClick={resetFilters}
                      className="rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Clear All
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No active filters</span>
                )}
              </div>

              <div className="inline-flex items-center rounded-xl border bg-muted/20 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    viewMode === 'table' ? 'bg-card shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <Table2 className="h-4 w-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    viewMode === 'timeline' ? 'bg-card shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <BellRing className="h-4 w-4" />
                  Timeline
                </button>
              </div>
            </div>
          </div>
        )}

        {hasSearched ? (
          <ErrorBoundary fallback={<TransactionErrorState error={error} onRetry={() => refetch()} />}>
            {viewMode === 'table' ? (
              <TransactionResultsTable
                transactions={transactions}
                isLoading={isInitialResultsLoading}
                onRowClick={handleRowClick}
                selectedTransactionIds={selectedTransactionIds}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                onToggleTransactionSelection={toggleTransactionSelection}
                onToggleSelectAllVisible={toggleAllVisibleTransactions}
                highlightedTransactionIds={highlightedIds}
                pageIndex={appliedFilters.page}
                pageSize={appliedFilters.pageSize}
                totalRows={summary.totalResults}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                sortBy={appliedFilters.sortBy}
                sortDirection={appliedFilters.sortDirection}
                onSortChange={setSort}
              />
            ) : (
              <div className="avoid-break">
                <TransactionTimeline
                  transactions={transactions}
                  onSelectTransaction={handleRowClick}
                  flashingTransactionIds={flashingTransactionIds}
                  highlightedTransactionId={highlightedTransactionId}
                />
              </div>
            )}
          </ErrorBoundary>
        ) : (
          <EmptyState
            title="Search for transactions"
            description="Use the search form above to find transactions by reference, account, date range, or other criteria."
            icon={Search}
          />
        )}
      </div>

      <BulkActionBar
        count={selectedTransactionIds.length}
        onExportSelected={handleExportSelected}
        onPrintSelected={handlePrintSelected}
        onDisputeSelected={() => setDisputeModalOpen(true)}
        onClearSelection={clearSelection}
        canDispute={canFileDispute}
      />

      <ErrorBoundary fallback={<TransactionErrorState onRetry={handleCloseDetail} />}>
        <TransactionDetailModal
          transaction={selectedTransaction}
          open={detailOpen}
          onClose={handleCloseDetail}
        />
      </ErrorBoundary>

      {canGenerateStatement && (
        <StatementGenerator
          open={statementGeneratorOpen}
          initialAccountNumber={filters.accountNumber || selectedTransaction?.accountNumber || selectedTransaction?.fromAccount || ''}
          initialEmail={selectedTransaction?.customerEmail}
          onClose={() => setStatementGeneratorOpen(false)}
        />
      )}

      {canFileDispute && disputeModalOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDisputeModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl">
              <h3 className="text-lg font-semibold">Batch Dispute Form</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepare a dispute packet for the selected transactions. This generates an operations-ready CSV intake pack.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Category</label>
                  <select
                    value={disputeCategory}
                    onChange={(event) => setDisputeCategory(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="UNAUTHORIZED">Unauthorized</option>
                    <option value="DUPLICATE">Duplicate</option>
                    <option value="PROCESSING_ERROR">Processing Error</option>
                    <option value="BENEFICIARY_DISPUTE">Beneficiary Dispute</option>
                  </select>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected</p>
                  <p className="mt-2 text-xl font-semibold">{selectedTransactionIds.length}</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium">Reason</label>
                <textarea
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe the issue affecting the selected transactions..."
                />
              </div>

              <div className="mt-4 max-h-48 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left">Reference</th>
                      <th className="px-3 py-2 text-left">Narration</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{transaction.reference}</td>
                        <td className="px-3 py-2">{transaction.narration}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatTransactionAmount(transaction).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDisputeModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitBatchDispute}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Download Dispute Packet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={largeExportWarningOpen}
        onClose={() => {
          setLargeExportWarningOpen(false);
          setPendingExportFormat(null);
        }}
        onConfirm={() => {
          if (pendingExportFormat) {
            executeExport(pendingExportFormat, transactions);
          }
          setLargeExportWarningOpen(false);
          setPendingExportFormat(null);
        }}
        title="Large Export Warning"
        description="More than 1,000 matching transactions were found. This export will contain only the transactions currently visible on the page."
        confirmLabel="Export Visible Rows"
        cancelLabel="Cancel"
      >
        <p className="text-sm text-muted-foreground">
          Narrow the filters further if you need a smaller, more focused export set.
        </p>
        <button
          onClick={handleCopyServerSideExportRequest}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <FileText className="h-4 w-4" />
          Copy Server-side Export Request
        </button>
      </ConfirmDialog>

      {shortcutHelpOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShortcutHelpOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                  <p className="text-sm text-muted-foreground">Power-user controls for the transaction workstation.</p>
                </div>
                <button
                  onClick={() => setShortcutHelpOpen(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  ['Ctrl/Cmd + Enter', 'Run search'],
                  ['Ctrl/Cmd + F', 'Focus search input'],
                  ['Ctrl/Cmd + E', 'Export CSV'],
                  ['Ctrl/Cmd + P', 'Print current results'],
                  ['Ctrl/Cmd + A', 'Select all visible rows'],
                  ['Alt + R', 'Toggle live mode'],
                  ['/', 'Focus search input'],
                  ['?', 'Open shortcut help'],
                  ['Escape', 'Close modal or clear selection'],
                ].map(([keys, action]) => (
                  <div key={keys} className="rounded-xl border bg-muted/20 px-4 py-3">
                    <p className="font-mono text-sm font-semibold">{keys}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
