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
  const completedPayments = qrTransactions.filter((tx) => tx.status === 'COMPLETED').length;
  const pendingPayments = qrTransactions.filter((tx) => tx.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        title="QR Payments"
        subtitle="Generate QR codes for receiving payments instantly"
      />
      <div className="page-container space-y-6">
        <section className="payment-hero-shell">
          <div className="payment-hero-grid">
            <div>
              <p className="payment-hero-kicker">Instant collections</p>
              <h2 className="payment-hero-title">Generate live payment QR codes and track settlement in one place</h2>
              <p className="payment-hero-description">
                Create dynamic or fixed-amount QR requests, monitor who has paid, and keep collection staff on a single operational screen.
              </p>
              <div className="payment-step-chip-row">
                <span className="payment-step-chip">{hasActiveQr ? 'Active QR ready' : 'Awaiting generation'}</span>
                <span className="payment-step-chip">{completedPayments} completed collections</span>
                <span className="payment-step-chip">{pendingPayments} pending settlements</span>
              </div>
            </div>

            <div className="payment-metrics-grid">
              <div className="payment-metric-card">
                <p className="payment-metric-label">Total QR Payments</p>
                <p className="payment-metric-value">{totalPayments}</p>
              </div>
              <div className="payment-metric-card">
                <p className="payment-metric-label">Total Received</p>
                <p className="payment-metric-value">{formatMoney(totalReceived, 'NGN')}</p>
              </div>
              <div className="payment-metric-card">
                <p className="payment-metric-label">Active QR Code</p>
                <p className="payment-metric-value">{hasActiveQr ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="payment-workspace-shell space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.95fr)]">
            <QrGenerator onGenerated={(qr) => setGeneratedQr(qr)} />

            {generatedQr ? (
              <QrCodeDisplay qr={generatedQr} />
            ) : (
              <div className="payment-empty-state min-h-[420px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <svg
                    className="h-8 w-8 text-muted-foreground/40"
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
                <div>
                  <p className="text-sm font-medium text-foreground">No QR Code Generated</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fill in the form on the left to generate a payment QR code.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]">
            <section className="payment-panel p-8 text-center space-y-3">
              <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium">Scan QR Code</p>
              <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                QR code scanning is available on the mobile banking app. Open the CBS Mobile app and tap &quot;Scan to Pay&quot;.
              </p>
            </section>

            <section className="payment-panel p-5">
              <h3 className="text-sm font-semibold">QR Payment Analytics</h3>
              <div className="mt-4 space-y-3">
                <div className="payment-panel-muted rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Total QR Payments</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{totalPayments}</p>
                </div>
                <div className="payment-panel-muted rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Total Received</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(totalReceived, 'NGN')}</p>
                </div>
                <div className="payment-panel-muted rounded-2xl border border-border/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Active QR Code</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{hasActiveQr ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">QR Transaction History</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review recent QR settlements, payer references, and pending collection items.
              </p>
            </div>
            <QrTransactionHistory />
          </section>
        </div>
      </div>
    </>
  );
}
