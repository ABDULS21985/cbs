import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { QrGenerator } from '../components/qr/QrGenerator';
import { QrCodeDisplay } from '../components/qr/QrCodeDisplay';
import { QrTransactionHistory } from '../components/qr/QrTransactionHistory';
import type { QrCode } from '../api/qrApi';

export function QrPaymentPage() {
  const [generatedQr, setGeneratedQr] = useState<QrCode | null>(null);

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

        <div className="space-y-3">
          <h2 className="text-base font-semibold">QR Transaction History</h2>
          <QrTransactionHistory />
        </div>
      </div>
    </>
  );
}
