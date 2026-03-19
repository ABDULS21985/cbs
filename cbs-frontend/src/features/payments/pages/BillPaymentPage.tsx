import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { BillerCategoryGrid } from '../components/bills/BillerCategoryGrid';
import { BillPaymentForm } from '../components/bills/BillPaymentForm';
import { billPaymentApi, type BillerCategory, type Biller, type BillPaymentResponse } from '../api/billPaymentApi';

type Step = 'category' | 'biller' | 'pay' | 'receipt';

export function BillPaymentPage() {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<BillerCategory | null>(null);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [receipt, setReceipt] = useState<BillPaymentResponse | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['bill-categories'],
    queryFn: () => billPaymentApi.getCategories(),
  });

  const { data: billers = [] } = useQuery({
    queryKey: ['billers', selectedCategory?.code],
    queryFn: () => billPaymentApi.getBillersByCategory(selectedCategory!.code),
    enabled: !!selectedCategory,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['bill-favorites'],
    queryFn: () => billPaymentApi.getFavorites(),
  });

  if (step === 'receipt' && receipt) {
    return (
      <>
        <PageHeader title="Payment Receipt" />
        <div className="page-container max-w-lg mx-auto text-center py-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Payment Successful</h2>
          <div className="rounded-lg border bg-card p-5 text-left text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Biller</span><span>{receipt.billerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatMoney(receipt.amount, 'NGN')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{receipt.transactionRef}</span></div>
            {receipt.token && <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-mono font-semibold text-green-600">{receipt.token}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDateTime(receipt.paidAt)}</span></div>
          </div>
          <button onClick={() => { setStep('category'); setReceipt(null); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            Make Another Payment
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Bill Payments" subtitle="Pay bills and purchase airtime" />
      <div className="page-container space-y-6">
        {/* Favorites */}
        {step === 'category' && favorites.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> Favorites</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {favorites.slice(0, 4).map((fav) => (
                <button key={fav.id} className="text-left p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <p className="text-sm font-medium truncate">{fav.alias || fav.billerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Last: {formatMoney(fav.lastPaidAmount, 'NGN')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'category' && (
          <BillerCategoryGrid categories={categories} onSelect={(cat) => { setSelectedCategory(cat); setStep('biller'); }} />
        )}

        {step === 'biller' && selectedCategory && (
          <div className="space-y-4">
            <button onClick={() => setStep('category')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to categories
            </button>
            <h3 className="text-sm font-semibold">{selectedCategory.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {billers.map((biller) => (
                <button
                  key={biller.id}
                  onClick={() => { setSelectedBiller(biller); setStep('pay'); }}
                  className="text-left p-4 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors"
                >
                  <p className="text-sm font-medium">{biller.name}</p>
                  <p className="text-xs text-muted-foreground">{biller.code}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'pay' && selectedBiller && (
          <BillPaymentForm
            biller={selectedBiller}
            onSuccess={(result) => { setReceipt(result); setStep('receipt'); }}
            onBack={() => setStep('biller')}
          />
        )}
      </div>
    </>
  );
}
