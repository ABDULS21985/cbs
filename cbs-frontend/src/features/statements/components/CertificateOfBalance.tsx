import { forwardRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/formatters';
import { numberToWords } from '../api/statementApi';
import type { CertificateData } from '../api/statementApi';

interface CertificateOfBalanceProps {
  data: CertificateData;
  onDownload: () => void;
}

export const CertificateOfBalance = forwardRef<HTMLDivElement, CertificateOfBalanceProps>(
  ({ data, onDownload }, ref) => {
    return (
      <div className="space-y-3">
        {/* Action bar — hidden when printing */}
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Print-only global styles */}
        <style>{`
          @media print {
            html, body { margin: 0; padding: 0; background: white !important; color: black !important; }
            .sidebar, .topbar, nav, header, [data-sidebar], [data-topbar],
            .no-print, button, [role="navigation"] { display: none !important; }
            #cert-balance-root { box-shadow: none !important; border: none !important; }
            @page { margin: 20mm; size: A4 portrait; }
          }
        `}</style>

        {/* Certificate body */}
        <div
          ref={ref}
          id="cert-balance-root"
          className="bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm p-10 print:shadow-none print:border-none print:rounded-none"
          style={{ fontFamily: "'Inter', Georgia, serif", minWidth: 640 }}
        >
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-blue-700 pb-5 mb-8">
            <div>
              <div className="text-3xl font-bold text-blue-700 tracking-tight">
                Bell<span className="text-amber-500">Bank</span>
              </div>
              <div className="text-sm text-gray-600 mt-0.5 font-medium">{data.bankName}</div>
              <div className="text-xs text-gray-500 mt-0.5">{data.bankAddress}</div>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-0.5">
              <div>Date: <span className="font-medium text-gray-700">{formatDate(data.generatedAt)}</span></div>
              <div>Reference: <span className="font-mono font-medium text-gray-700">{data.referenceNumber}</span></div>
            </div>
          </div>

          {/* Addressee */}
          <div className="mb-6">
            <p className="font-semibold text-gray-700">{data.addressedTo}</p>
          </div>

          {/* Subject */}
          <p className="font-bold text-gray-800 uppercase tracking-wider mb-6 underline text-center text-base">
            RE: Certificate of Balance
          </p>

          {/* Body */}
          <div className="space-y-4 text-gray-700 leading-relaxed text-[15px]">
            <p>
              We hereby certify that as at{' '}
              <strong>{formatDate(data.balanceDate)}</strong>, the balance on Account Number{' '}
              <strong className="font-mono tracking-widest">{data.accountNumber}</strong>{' '}
              in the name of <strong>{data.accountName}</strong> held with{' '}
              <strong>{data.bankName}</strong> is:
            </p>

            {/* Amount block */}
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-5 text-center my-6">
              <div className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-1">
                {data.currency} — {numberToWords(data.balance)}
              </div>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {formatMoney(data.balance, data.currency)}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Account Type:</span> {data.accountType}
            </div>

            <p>
              This certificate is issued at the request of the account holder for{' '}
              purposes requested and for no other purpose.
            </p>

            <p>
              This information is provided in strict confidence and must not be disclosed to any
              third party without prior written consent of the account holder.
            </p>
          </div>

          {/* Sign-off */}
          <div className="mt-10 text-gray-700">
            <p>Yours faithfully,</p>
            <div className="mt-8 border-b border-gray-400 w-56" />
            <p className="mt-2 font-semibold">{data.authorizedBy}</p>
            <p className="text-sm text-gray-500">{data.authorizedTitle}</p>
            <p className="text-sm text-gray-500">{data.bankName}</p>
          </div>

          {/* Verification footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            <p>
              This document bears reference <span className="font-mono font-medium">{data.referenceNumber}</span>.
              For verification, contact: <span className="font-medium">support@bellbank.ng</span>
            </p>
            <p className="mt-0.5">
              {data.bankName} is licensed and supervised by the Central Bank of Nigeria.
            </p>
          </div>
        </div>
      </div>
    );
  },
);

CertificateOfBalance.displayName = 'CertificateOfBalance';
