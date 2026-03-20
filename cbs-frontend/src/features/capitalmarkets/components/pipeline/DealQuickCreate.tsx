import { useState, useRef, useEffect } from 'react';
import { Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateDeal } from '../../hooks/useCapitalMarkets';
import type { DealType } from '../../api/capitalMarketsApi';

interface DealQuickCreateProps {
  open: boolean;
  onClose: () => void;
}

export function DealQuickCreate({ open, onClose }: DealQuickCreateProps) {
  const [type, setType] = useState<DealType>('ECM');
  const [issuer, setIssuer] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const inputRef = useRef<HTMLInputElement>(null);
  const createDeal = useCreateDeal();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // Parent controls open state — this is a hint
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = () => {
    if (!issuer.trim() || !amount) return;
    createDeal.mutate(
      { type, issuer: issuer.trim(), targetAmount: Number(amount), currency, tenor: '—' },
      {
        onSuccess: () => {
          toast.success(`Deal created for ${issuer}`);
          setIssuer('');
          setAmount('');
          onClose();
        },
        onError: () => toast.error('Failed to create deal'),
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 top-[20%] z-50 flex justify-center px-4">
        <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Quick Deal</span>
            <div className="flex-1" />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">ESC</kbd>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="p-4 space-y-3" onKeyDown={handleKeyDown}>
            {/* Type toggle */}
            <div className="flex items-center gap-2">
              {(['ECM', 'DCM'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                    type === t
                      ? t === 'ECM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="ml-auto h-7 px-2 text-xs rounded-lg border bg-background">
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Issuer */}
            <input
              ref={inputRef}
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Issuer name…"
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            {/* Amount */}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Target amount"
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-muted-foreground">Press <kbd className="px-1 py-0.5 rounded border bg-muted text-[9px]">Enter</kbd> to create</p>
              <button
                onClick={handleSubmit}
                disabled={createDeal.isPending || !issuer.trim() || !amount}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {createDeal.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create Deal
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
