import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import type { FixedDeposit } from '../api/fixedDepositApi';

interface FdCertificateProps {
  fd: FixedDeposit;
}

export function FdCertificate({ fd }: FdCertificateProps) {
  const [watermark, setWatermark] = useState<'ORIGINAL' | 'COPY'>('ORIGINAL');

  return (
    <div>
      <div className="flex items-center justify-between mb-3 print:hidden">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Fixed Deposit Certificate</h3>
          <div className="flex gap-1">
            {(['ORIGINAL', 'COPY'] as const).map((w) => (
              <button key={w} onClick={() => setWatermark(w)} className={cn('px-2 py-0.5 text-[10px] font-medium rounded', watermark === w ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div id="fd-certificate" className="rounded-xl border-2 border-gray-800 dark:border-gray-400 bg-white dark:bg-gray-950 p-8 space-y-6 print:border-black print:shadow-none relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none print:block" aria-hidden>
          <span className="text-[120px] font-black text-gray-100 dark:text-gray-900/30 rotate-[-30deg] tracking-[0.3em]">{watermark}</span>
        </div>
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 dark:border-gray-400 pb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black text-primary">CBS</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">
            Community Bank of Savings
          </h1>
          <p className="text-xs text-gray-500 mt-1">Licensed and regulated by the Central Bank of Nigeria</p>
          <div className="mt-4">
            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-wider border-2 border-gray-800 dark:border-gray-400 inline-block px-6 py-2">
              Fixed Deposit Certificate
            </h2>
          </div>
        </div>

        {/* FD Details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">This certifies that</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{fd.customerName}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Certificate Number</p>
            <p className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">{fd.fdNumber}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Source Account</p>
            <p className="font-mono text-gray-800 dark:text-gray-200 mt-0.5">{fd.sourceAccountNumber}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Principal Amount</p>
            <p className="font-mono font-bold text-gray-800 dark:text-gray-200 text-lg mt-0.5">
              {formatMoney(fd.principalAmount, fd.currency)}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Currency</p>
            <p className="text-gray-800 dark:text-gray-200 mt-0.5">{fd.currency}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Interest Rate Per Annum</p>
            <p className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">{formatPercent(fd.interestRate)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Tenor</p>
            <p className="text-gray-800 dark:text-gray-200 mt-0.5">{fd.tenor} Days</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Placement Date</p>
            <p className="text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(fd.startDate)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Maturity Date</p>
            <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(fd.maturityDate)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Gross Interest</p>
            <p className="font-mono text-gray-800 dark:text-gray-200 mt-0.5">{formatMoney(fd.grossInterest, fd.currency)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Withholding Tax (10%)</p>
            <p className="font-mono text-gray-800 dark:text-gray-200 mt-0.5">{formatMoney(fd.wht, fd.currency)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Net Interest</p>
            <p className="font-mono text-gray-800 dark:text-gray-200 mt-0.5">{formatMoney(fd.netInterest, fd.currency)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Maturity Value</p>
            <p className="font-mono font-bold text-lg text-gray-800 dark:text-gray-200 mt-0.5">
              {formatMoney(fd.maturityValue, fd.currency)}
            </p>
          </div>
        </div>

        {/* Declaration */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400">
          <p>
            This certificate confirms that the above-named depositor has placed a fixed deposit with Community Bank of Savings on the terms stated herein.
            The deposit is subject to the terms and conditions governing fixed deposits as may be amended from time to time. This certificate is not transferable.
            In the event of loss of this certificate, please notify the bank immediately.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4">
          <div className="text-center">
            <div className="border-t-2 border-gray-800 dark:border-gray-400 pt-2 mx-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Authorised Signature</p>
              <p className="text-xs text-gray-400 mt-0.5">Account Officer</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-800 dark:border-gray-400 pt-2 mx-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Authorised Signature</p>
              <p className="text-xs text-gray-400 mt-0.5">Branch Manager</p>
            </div>
          </div>
        </div>

        {/* QR Code Area */}
        <div className="flex items-center justify-between pt-2">
          <div className="w-20 h-20 border-2 border-gray-400 rounded flex items-center justify-center text-[8px] text-gray-400 text-center leading-tight">
            QR Code<br />{fd.fdNumber}<br />{formatMoney(fd.principalAmount, fd.currency)}
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Serial: {fd.fdNumber}-{watermark.charAt(0)}</p>
            <p>Verification: scan QR code</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4 relative z-10">
          <p className="text-xs text-gray-400">
            Issued on {formatDate(fd.startDate)} · Certificate No. {fd.fdNumber} · {watermark}
          </p>
        </div>
      </div>
    </div>
  );
}
