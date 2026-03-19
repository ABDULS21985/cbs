import { forwardRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import type { AccountConfirmationData } from '../api/statementApi';

const PURPOSE_LABELS: Record<string, string> = {
  EMPLOYER_VERIFICATION: 'Employer Verification',
  VISA_APPLICATION: 'Visa Application',
  VENDOR_ONBOARDING: 'Vendor Onboarding',
  LOAN_APPLICATION: 'Loan Application',
  OTHER: 'General Purpose',
};

interface AccountConfirmationLetterProps {
  data: AccountConfirmationData;
  onDownload: () => void;
}

export const AccountConfirmationLetter = forwardRef<HTMLDivElement, AccountConfirmationLetterProps>(
  ({ data, onDownload }, ref) => {
    const purposeLabel = PURPOSE_LABELS[data.purpose] ?? data.purpose;

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

        {/* Print styles */}
        <style>{`
          @media print {
            html, body { margin: 0; padding: 0; background: white !important; color: black !important; }
            .sidebar, .topbar, nav, header, [data-sidebar], [data-topbar],
            .no-print, button, [role="navigation"] { display: none !important; }
            #conf-letter-root { box-shadow: none !important; border: none !important; }
            @page { margin: 20mm; size: A4 portrait; }
          }
        `}</style>

        {/* Letter body */}
        <div
          ref={ref}
          id="conf-letter-root"
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
            RE: Account Confirmation Letter — {purposeLabel}
          </p>

          {/* Body */}
          <div className="space-y-4 text-gray-700 leading-relaxed text-[15px]">
            <p>
              We write to confirm that the under-mentioned account is maintained with{' '}
              <strong>{data.bankName}</strong> and is in good standing as at the date of this letter.
            </p>

            {/* Account Details Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden my-6">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: 'Account Holder Name', value: data.accountName },
                    { label: 'Account Number', value: <span className="font-mono tracking-widest">{data.accountNumber}</span> },
                    { label: 'Account Type', value: data.accountType },
                    { label: 'Date of Account Opening', value: formatDate(data.openingDate) },
                    { label: 'Currency', value: data.currency },
                    { label: 'Account Status', value: <span className="text-green-700 font-semibold">{data.status}</span> },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-gray-500 font-medium w-1/2 border-r border-gray-200">{row.label}</td>
                      <td className="px-4 py-2.5 text-gray-800 font-semibold">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              This letter is issued at the request of the account holder for the purpose of{' '}
              <strong>{purposeLabel}</strong> and is strictly for use in connection with such purpose only.
            </p>

            <p>
              The information contained herein is provided in confidence. {data.bankName} does not
              accept any liability arising from any decision made based on the information provided
              in this letter.
            </p>

            <p>
              Should you require any further clarification, please do not hesitate to contact us on{' '}
              <strong>0700-BELL-BANK</strong> or via email at{' '}
              <strong>support@bellbank.ng</strong>.
            </p>
          </div>

          {/* Sign-off */}
          <div className="mt-10 text-gray-700">
            <p>Yours faithfully,</p>
            <div className="mt-8 border-b border-gray-400 w-56" />
            <p className="mt-2 font-semibold">Authorised Signatory</p>
            <p className="text-sm text-gray-500">Customer Operations</p>
            <p className="text-sm text-gray-500">{data.bankName}</p>
          </div>

          {/* Verification footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            <p>
              This document bears reference{' '}
              <span className="font-mono font-medium">{data.referenceNumber}</span>.
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

AccountConfirmationLetter.displayName = 'AccountConfirmationLetter';
