import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { QrGenerator } from '../components/qr/QrGenerator';
import { QrCodeDisplay } from '../components/qr/QrCodeDisplay';
import { QrTransactionHistory } from '../components/qr/QrTransactionHistory';
import { qrApi, type QrCode } from '../api/qrApi';
import { formatMoney } from '@/lib/formatters';

export function QrPaymentPage() {
  useEffect(() => { document.title = 'QR Payments | CBS'; }, []);
  const [generatedQr, setGeneratedQr] = useState<QrCode | null>(null);

  const { data: qrTransactions = [] } = useQuery({
    queryKey: ['qr-transactions'],
    queryFn: () => qrApi.getQrTransactions(),
  });

  const totalPayments = qrTransactions.length;
  const totalReceived = qrTransactions
    .filter((tx) => tx.status === 'COMPLETED')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const hasActiveQr = generatedQr !== null;

  return (
    <>
      <PageHeader
        title="QR Payments"
        subtitle="Generate QR codes for receiving payments instantly"
      />
      <div className="page-container space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <QrGenerator onGenerated={(qr) => setGeneratedQr(qr)} />
          </div>
          <div>
            {generatedQr ? (
              <QrCodeDisplay qr={generatedQr} />
            ) : (
              <div className="rounded-lg border bg-card h-full flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px]">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-muted-foreground">No QR Code Generated</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fill in the form on the left to generate a payment QR code
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scan QR Code placeholder */}
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <Smartphone className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium">Scan QR Code</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            QR code scanning is available on the mobile banking app. Open the CBS Mobile app and tap "Scan to Pay".
          </p>
          {/* TODO: Integrate QR scanner library (e.g., html5-qrcode or @yudiel/react-qr-scanner) for web scanning */}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">QR Payment Analytics</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">Total QR Payments</p>
              <p className="text-lg font-bold">{totalPayments}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">Total Received</p>
              <p className="text-lg font-bold">{formatMoney(totalReceived, 'NGN')}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">Active QR Code</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  hasActiveQr
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {hasActiveQr ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">QR Transaction History</h2>
          <QrTransactionHistory />
        </div>
      </div>
    </>
  );
}
