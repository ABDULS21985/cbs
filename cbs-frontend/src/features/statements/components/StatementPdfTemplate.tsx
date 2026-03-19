import { forwardRef } from 'react';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { StatementData } from '../api/statementApi';

interface StatementPdfTemplateProps {
  data: StatementData;
}

export const StatementPdfTemplate = forwardRef<HTMLDivElement, StatementPdfTemplateProps>(
  ({ data }, ref) => {
    const generatedDate = new Date(data.generatedAt);
    const timeWAT = generatedDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });

    return (
      <>
        {/* Print-only global styles */}
        <style>{`
          @media print {
            html, body { margin: 0; padding: 0; background: white !important; color: black !important; }
            .sidebar, .topbar, nav, header, [data-sidebar], [data-topbar],
            .no-print, button, [role="navigation"] { display: none !important; }
            #statement-print-root { box-shadow: none !important; border: none !important; }
            @page { margin: 18mm 15mm; size: A4 portrait; }
          }
        `}</style>

        <div
          ref={ref}
          id="statement-print-root"
          className="bg-white text-gray-900 font-sans text-sm leading-relaxed print:shadow-none print:border-none"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", minWidth: 640 }}
        >
          {/* ── Letterhead ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between border-b-2 border-blue-700 pb-4 mb-4 px-1">
            <div>
              <div className="text-2xl font-bold text-blue-700 tracking-tight">
                Bell<span className="text-amber-500">Bank</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{data.bankName}</div>
              <div className="text-xs text-gray-500">{data.bankAddress}</div>
              <div className="text-xs text-gray-500">CBN License: {data.bankLicense}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold uppercase tracking-widest text-gray-800">Account Statement</div>
              <div className="text-xs text-gray-500 mt-1">
                Period: <span className="font-medium text-gray-700">{formatDate(data.periodFrom)}</span>
                {' '}—{' '}
                <span className="font-medium text-gray-700">{formatDate(data.periodTo)}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Generated: {formatDate(data.generatedAt)} at {timeWAT} WAT
              </div>
            </div>
          </div>

          {/* ── Account Details ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 border border-gray-200 rounded p-3 bg-gray-50">
            <div>
              <span className="text-xs text-gray-500">Account Holder</span>
              <div className="font-semibold text-gray-800">{data.accountName}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Account Number</span>
              <div className="font-semibold tracking-widest text-gray-800">{data.accountNumber}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Account Type</span>
              <div className="text-gray-700">{data.accountType}</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">Currency</span>
              <div className="text-gray-700">{data.currency}</div>
            </div>
          </div>

          {/* ── Summary Bar ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-gray-200 rounded p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Opening Balance</div>
              <div className="font-mono font-semibold text-gray-800">{formatMoney(data.openingBalance, data.currency)}</div>
            </div>
            <div className="border border-gray-200 rounded p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Closing Balance</div>
              <div className="font-mono font-bold text-blue-700">{formatMoney(data.closingBalance, data.currency)}</div>
            </div>
            <div className="border border-gray-200 rounded p-2.5 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Net Movement</div>
              <div className={`font-mono font-semibold ${data.closingBalance >= data.openingBalance ? 'text-green-700' : 'text-red-600'}`}>
                {formatMoney(Math.abs(data.closingBalance - data.openingBalance), data.currency)}
              </div>
            </div>
          </div>

          {/* ── Transaction Table ────────────────────────────────────────── */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th className="text-left px-2 py-2 font-semibold">Date</th>
                <th className="text-left px-2 py-2 font-semibold">Reference</th>
                <th className="text-left px-2 py-2 font-semibold">Description</th>
                <th className="text-left px-2 py-2 font-semibold">Channel</th>
                <th className="text-right px-2 py-2 font-semibold">Debit (₦)</th>
                <th className="text-right px-2 py-2 font-semibold">Credit (₦)</th>
                <th className="text-right px-2 py-2 font-semibold">Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                >
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-2 py-1.5 font-mono text-gray-600 text-[10px] whitespace-nowrap">{tx.reference}</td>
                  <td className="px-2 py-1.5 text-gray-800 max-w-[200px]">{tx.description}</td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{tx.channel ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-red-600">
                    {tx.debit != null ? tx.debit.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-green-700">
                    {tx.credit != null ? tx.credit.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-medium text-gray-800">
                    {tx.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer Summary ───────────────────────────────────────────── */}
          <div className="mt-3 border-t-2 border-blue-700 pt-3 flex justify-between items-start">
            <div className="space-y-0.5">
              <div className="text-xs text-gray-500">
                Total Debits:{' '}
                <span className="font-mono font-semibold text-red-600">{formatMoney(data.totalDebits, data.currency)}</span>
              </div>
              <div className="text-xs text-gray-500">
                Total Credits:{' '}
                <span className="font-mono font-semibold text-green-700">{formatMoney(data.totalCredits, data.currency)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Transactions: <span className="font-medium">{data.transactions.length}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Closing Balance</div>
              <div className="text-xl font-bold font-mono text-blue-700">{formatMoney(data.closingBalance, data.currency)}</div>
            </div>
          </div>

          {/* ── Legal Footer ─────────────────────────────────────────────── */}
          <div className="mt-6 border-t border-gray-200 pt-3 text-[10px] text-gray-400 text-center leading-relaxed">
            <p>
              This statement is computer-generated and does not require a signature. For queries, contact{' '}
              <span className="font-medium">{data.bankEmail}</span> or call{' '}
              <span className="font-medium">{data.bankPhone}</span>.
            </p>
            <p className="mt-0.5">
              {data.bankName} is licensed by the Central Bank of Nigeria. License No. {data.bankLicense}.
            </p>
          </div>
        </div>
      </>
    );
  },
);

StatementPdfTemplate.displayName = 'StatementPdfTemplate';
