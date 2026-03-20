import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ParsedStatement } from '../api/reconciliationApi';

interface StatementPreviewProps {
  statement: ParsedStatement;
  onAccept: () => Promise<void>;
  onReject: () => void;
}

export function StatementPreview({ statement, onAccept, onReject }: StatementPreviewProps) {
  const [accepting, setAccepting] = useState(false);
  const { header, entries, isDuplicate, parseWarnings } = statement;

  const computedClosing = header.openingBalance + header.totalCredits - header.totalDebits;
  const balanceValid = Math.abs(computedClosing - header.closingBalance) < 0.01;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Duplicate Warning */}
      {isDuplicate && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3.5 py-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Potential duplicate.</strong> A statement for account {header.accountNumber} on{' '}
            {formatDate(header.statementDate)} may already exist. Review carefully before importing.
          </p>
        </div>
      )}

      {/* Parse Warnings */}
      {parseWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-3.5 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <p className="font-semibold">Parse Warnings:</p>
          {parseWarnings.map((w, i) => (
            <p key={i}>- {w}</p>
          ))}
        </div>
      )}

      {/* Statement Header */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statement Header</p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Account Number</p>
            <p className="font-mono font-semibold mt-0.5">{header.accountNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Statement Date</p>
            <p className="font-medium mt-0.5">{formatDate(header.statementDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Currency</p>
            <p className="font-medium mt-0.5">{header.currency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Bank</p>
            <p className="font-medium mt-0.5">{header.bankName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Opening Balance</p>
            <p className="font-mono font-semibold mt-0.5">{formatMoney(header.openingBalance, header.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Credits</p>
            <p className="font-mono font-semibold mt-0.5 text-green-700 dark:text-green-400">
              +{formatMoney(header.totalCredits, header.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Debits</p>
            <p className="font-mono font-semibold mt-0.5 text-red-700 dark:text-red-400">
              -{formatMoney(header.totalDebits, header.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Closing Balance</p>
            <p className="font-mono font-semibold mt-0.5">{formatMoney(header.closingBalance, header.currency)}</p>
          </div>
        </div>

        {/* Balance Validation */}
        <div className="mx-4 mb-4">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-medium',
              balanceValid
                ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
            )}
          >
            {balanceValid ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>
              Balance Validation: Opening ({formatMoney(header.openingBalance, header.currency)}) + Credits - Debits ={' '}
              {formatMoney(computedClosing, header.currency)}
              {balanceValid ? ' = Closing Balance' : ` (expected ${formatMoney(header.closingBalance, header.currency)})`}
            </span>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Entries ({entries.length})
          </p>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Value Date</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">D/C</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Narration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(entry.valueDate)}</td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono whitespace-nowrap',
                      entry.direction === 'C' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
                    )}
                  >
                    {entry.direction === 'C' ? '+' : '-'}
                    {formatMoney(entry.amount, header.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold',
                        entry.direction === 'C'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      )}
                    >
                      {entry.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{entry.reference}</td>
                  <td className="px-4 py-2.5 max-w-[260px] truncate">{entry.narration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onReject}
          disabled={accepting}
          className="px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {accepting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Importing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Accept & Import
            </>
          )}
        </button>
      </div>
    </div>
  );
}
