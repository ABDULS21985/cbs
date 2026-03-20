import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRegisterFeed } from '../hooks/useMarketData';
import type { FeedType } from '../types';

interface RegisterFeedDialogProps {
  onClose: () => void;
}

/** Dialog form for registering a new market data feed. */
export function RegisterFeedDialog({ onClose }: RegisterFeedDialogProps) {
  const registerFeed = useRegisterFeed();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    provider: '',
    assetClass: '',
    feedType: 'REALTIME' as FeedType,
    instrumentsRaw: '',
  });

  // Focus trap: focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const instruments = form.instrumentsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    registerFeed.mutate(
      { provider: form.provider, assetClass: form.assetClass, feedType: form.feedType, instruments },
      { onSuccess: onClose },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-feed-title"
    >
      <div
        ref={dialogRef}
        className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 id="register-feed-title" className="text-lg font-semibold mb-4">
          Register Data Feed
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rf-provider" className="text-sm font-medium text-muted-foreground">
              Provider
            </label>
            <input
              id="rf-provider"
              ref={firstInputRef}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="e.g. Bloomberg, Reuters"
              required
            />
          </div>
          <div>
            <label htmlFor="rf-asset" className="text-sm font-medium text-muted-foreground">
              Asset Class
            </label>
            <input
              id="rf-asset"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.assetClass}
              onChange={(e) => setForm((f) => ({ ...f, assetClass: e.target.value }))}
              placeholder="e.g. EQUITIES, FX, FIXED_INCOME"
              required
            />
          </div>
          <div>
            <label htmlFor="rf-type" className="text-sm font-medium text-muted-foreground">
              Feed Type
            </label>
            <select
              id="rf-type"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.feedType}
              onChange={(e) => setForm((f) => ({ ...f, feedType: e.target.value as FeedType }))}
            >
              <option value="REALTIME">Real-time</option>
              <option value="EOD">End of Day</option>
            </select>
          </div>
          <div>
            <label htmlFor="rf-instruments" className="text-sm font-medium text-muted-foreground">
              Instruments (comma-separated)
            </label>
            <input
              id="rf-instruments"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.instrumentsRaw}
              onChange={(e) => setForm((f) => ({ ...f, instrumentsRaw: e.target.value }))}
              placeholder="DANGCEM, GTCO, ZENITH"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerFeed.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {registerFeed.isPending ? 'Registering\u2026' : 'Register Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
